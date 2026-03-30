import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.resume import Resume
from app.models.job_description import JobDescription
from app.models.candidate_job_match import CandidateJobMatch
from app.schemas.resume import MatchRequest, MatchResponse
from app.services.ai_service import get_openrouter_client, MATCH_PROMPT
from app.utils.deps import get_current_user
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/matching", tags=["matching"])


def _clean_json(raw: str) -> dict:
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return json.loads(cleaned.strip())


@router.post("/match")
def match_resume_to_jd(
    body: MatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = (
        db.query(Resume)
        .filter(Resume.id == body.resume_id, Resume.user_email == current_user.email)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    jd = (
        db.query(JobDescription)
        .filter(
            JobDescription.id == body.jd_id,
            JobDescription.user_email == current_user.email,
        )
        .first()
    )
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")

    parsed = resume.parsed_data or {}
    prompt = MATCH_PROMPT.format(
        candidate_name=resume.candidate_name or "Unknown",
        skills=json.dumps(parsed.get("skills", [])),
        experience_summary=parsed.get("experience_summary", ""),
        education=parsed.get("education", ""),
        years_of_experience=parsed.get("years_of_experience", ""),
        role_title=jd.role_title or "",
        requirements=jd.raw_text or json.dumps(jd.parsed_data or {}),
    )

    client = get_openrouter_client()
    completion = client.chat.completions.create(
        model=settings.GEMINI_FLASH_LITE,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = completion.choices[0].message.content or ""
    try:
        match_result = _clean_json(raw)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500, detail="Failed to parse model response as JSON"
        )

    record = CandidateJobMatch(
        user_email=current_user.email,
        resume_id=body.resume_id,
        jd_id=body.jd_id,
        confidence_score=match_result.get("confidence_score"),
        skills_score=match_result.get("skills_score"),
        experience_score=match_result.get("experience_score"),
        semantic_score=match_result.get("semantic_score"),
        matched_skills=match_result.get("matched_skills"),
        missing_skills=match_result.get("missing_skills"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "match": {
            "id": record.id,
            "confidence_score": float(record.confidence_score or 0),
            "skills_score": float(record.skills_score or 0),
            "experience_score": float(record.experience_score or 0),
            "semantic_score": float(record.semantic_score or 0),
            "matched_skills": record.matched_skills,
            "missing_skills": record.missing_skills,
            "created_at": str(record.created_at),
        },
        "summary": match_result.get("summary", ""),
        "resume": {"id": resume.id, "candidate_name": resume.candidate_name},
        "jd": {"id": jd.id, "role_title": jd.role_title},
    }


@router.get("/history")
def match_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    base = db.query(CandidateJobMatch).filter(
        CandidateJobMatch.user_email == current_user.email
    )
    total = base.count()
    items = (
        base.order_by(CandidateJobMatch.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "items": [
            {
                "id": m.id,
                "user_email": m.user_email,
                "resume_id": m.resume_id,
                "jd_id": m.jd_id,
                "confidence_score": float(m.confidence_score or 0),
                "skills_score": float(m.skills_score or 0),
                "experience_score": float(m.experience_score or 0),
                "semantic_score": float(m.semantic_score or 0),
                "matched_skills": m.matched_skills,
                "missing_skills": m.missing_skills,
                "created_at": str(m.created_at),
            }
            for m in items
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.delete("/history")
def clear_match_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = (
        db.query(CandidateJobMatch)
        .filter(CandidateJobMatch.user_email == current_user.email)
        .delete()
    )
    db.commit()
    return {"deleted": deleted}
