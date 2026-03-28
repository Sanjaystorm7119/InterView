from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.interview import Interview
from app.models.feedback import InterviewFeedback
from app.schemas.interview import (
    InterviewCreate,
    InterviewUpdate,
    InterviewResponse,
    FeedbackCreate,
    FeedbackResponse,
    SaveTranscriptRequest,
)
from app.utils.deps import get_current_user, get_optional_user
from app.config import get_settings
import httpx

settings = get_settings()
router = APIRouter(prefix="/api/interviews", tags=["interviews"])


@router.post("/", response_model=InterviewResponse)
def create_interview(
    body: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.credits <= 0:
        raise HTTPException(status_code=403, detail="No credits remaining")

    interview = Interview(
        interview_id=body.interview_id,
        user_email=current_user.email,
        job_position=body.job_position,
        job_description=body.job_description,
        company_name=body.company_name,
        company_details=body.company_details,
        duration=body.duration,
        type=body.type,
        question_list=body.question_list,
        company_summary=body.company_summary,
    )
    db.add(interview)

    # Deduct credit
    current_user.credits = max(0, current_user.credits - 1)

    try:
        db.commit()
        db.refresh(interview)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create interview")

    return interview


@router.get("/", response_model=list[InterviewResponse])
def list_interviews(
    page: int = Query(1, ge=1),
    limit: int = Query(6, ge=1, le=50),
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Interview).filter(Interview.user_email == current_user.email)

    if search:
        search_filter = f"%{search}%"
        q = q.filter(
            (Interview.job_position.ilike(search_filter))
            | (Interview.company_name.ilike(search_filter))
        )

    q = q.order_by(Interview.created_at.desc())
    interviews = q.offset((page - 1) * limit).limit(limit).all()
    return interviews


@router.get("/count")
def count_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total = (
        db.query(func.count(Interview.id))
        .filter(Interview.user_email == current_user.email)
        .scalar()
    )
    return {"count": total}


@router.get("/latest", response_model=list[InterviewResponse])
def latest_interviews(
    limit: int = Query(6, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interviews = (
        db.query(Interview)
        .filter(Interview.user_email == current_user.email)
        .order_by(Interview.created_at.desc())
        .limit(limit)
        .all()
    )
    return interviews


@router.get("/public/{interview_id}")
def get_public_interview(interview_id: str, db: Session = Depends(get_db)):
    """Public endpoint for candidates to fetch interview details."""
    interview = (
        db.query(Interview).filter(Interview.interview_id == interview_id).first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return {
        "id": interview.id,
        "interview_id": interview.interview_id,
        "job_position": interview.job_position,
        "job_description": interview.job_description,
        "company_name": interview.company_name,
        "company_details": interview.company_details,
        "duration": interview.duration,
        "type": interview.type,
        "question_list": interview.question_list,
        "company_summary": interview.company_summary,
    }


@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = (
        db.query(Interview)
        .filter(
            Interview.interview_id == interview_id,
            Interview.user_email == current_user.email,
        )
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.put("/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: str,
    body: InterviewUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = (
        db.query(Interview)
        .filter(
            Interview.interview_id == interview_id,
            Interview.user_email == current_user.email,
        )
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    update_data = body.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(interview, k, v)

    db.commit()
    db.refresh(interview)
    return interview


@router.delete("/{interview_id}")
def delete_interview(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = (
        db.query(Interview)
        .filter(
            Interview.interview_id == interview_id,
            Interview.user_email == current_user.email,
        )
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    db.delete(interview)
    db.commit()
    return {"success": True}


# ── Feedback endpoints ──


@router.get("/{interview_id}/feedback", response_model=list[FeedbackResponse])
def list_feedback(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify the requesting user owns this interview
    interview = (
        db.query(Interview)
        .filter(
            Interview.interview_id == interview_id,
            Interview.user_email == current_user.email,
        )
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    feedbacks = (
        db.query(InterviewFeedback)
        .filter(InterviewFeedback.interview_id == interview_id)
        .order_by(InterviewFeedback.created_at.desc())
        .all()
    )
    return feedbacks


@router.get("/{interview_id}/feedback/count")
def feedback_count(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify the requesting user owns this interview
    interview = (
        db.query(Interview)
        .filter(
            Interview.interview_id == interview_id,
            Interview.user_email == current_user.email,
        )
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    count = (
        db.query(func.count(InterviewFeedback.id))
        .filter(InterviewFeedback.interview_id == interview_id)
        .scalar()
    )
    return {"count": count}


@router.post("/{interview_id}/feedback", response_model=FeedbackResponse)
def create_feedback(
    interview_id: str,
    body: FeedbackCreate,
    db: Session = Depends(get_db),
):
    """Public endpoint — candidates submit feedback after interview."""
    # Validate that the interview exists
    interview = (
        db.query(Interview)
        .filter(Interview.interview_id == interview_id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    fb = InterviewFeedback(
        interview_id=interview_id,
        user_email=body.user_email,
        user_name=body.user_name,
        feedback=body.feedback,
        transcript=body.transcript,
        call_id=body.call_id,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


@router.post("/save-transcript")
async def save_transcript(body: SaveTranscriptRequest, db: Session = Depends(get_db)):
    """Fetch transcript from Vapi and update feedback record."""
    # Validate that the interview exists
    interview = (
        db.query(Interview)
        .filter(Interview.interview_id == body.interviewId)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.vapi.ai/v1/calls/{body.callId}/transcript",
            headers={"Authorization": f"Bearer {settings.VAPI_API_KEY}"},
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch transcript from Vapi ({resp.status_code})",
        )

    vapi_data = resp.json()
    transcript = []

    if vapi_data and len(vapi_data) > 0:
        for item in vapi_data:
            if item.get("type") != "conversation-update":
                continue
            update = item.get("conversationUpdate", {})
            role = update.get("role")
            text = ""
            if update.get("content") and len(update["content"]) > 0:
                text = update["content"][0].get("text", "")

            if role == "assistant":
                transcript.append(
                    {
                        "ai_message": text,
                        "user_message": None,
                        "timestamp": update.get("timestamp"),
                    }
                )
            elif role == "user":
                transcript.append(
                    {
                        "ai_message": None,
                        "user_message": text,
                        "timestamp": update.get("timestamp"),
                    }
                )

    fb = (
        db.query(InterviewFeedback)
        .filter(
            InterviewFeedback.interview_id == body.interviewId,
            InterviewFeedback.user_email == body.userEmail,
        )
        .first()
    )

    if fb:
        fb.transcript = transcript
        fb.call_id = body.callId
        db.commit()

    return {"success": True, "message": "Transcript saved successfully"}
