from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.job_description import JobDescription
from app.schemas.resume import JobDescriptionCreate, JobDescriptionResponse
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/job-descriptions", tags=["job_descriptions"])


@router.post("/", response_model=JobDescriptionResponse)
def create_job_description(
    body: JobDescriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    jd = JobDescription(
        user_email=current_user.email,
        role_title=body.role_title,
        raw_text=body.raw_text,
        file_url=body.file_url,
        parsed_data=body.parsed_data,
        interview_id=body.interview_id or None,
    )
    db.add(jd)
    db.commit()
    db.refresh(jd)
    return jd


@router.get("/", response_model=list[JobDescriptionResponse])
def list_job_descriptions(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    jds = (
        db.query(JobDescription)
        .filter(JobDescription.user_email == current_user.email)
        .order_by(JobDescription.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return jds


@router.get("/count")
def count_job_descriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total = (
        db.query(func.count(JobDescription.id))
        .filter(JobDescription.user_email == current_user.email)
        .scalar()
    )
    return {"count": total}


@router.get("/{jd_id}", response_model=JobDescriptionResponse)
def get_job_description(
    jd_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    jd = (
        db.query(JobDescription)
        .filter(
            JobDescription.id == jd_id,
            JobDescription.user_email == current_user.email,
        )
        .first()
    )
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    return jd


@router.delete("/{jd_id}")
def delete_job_description(
    jd_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    jd = (
        db.query(JobDescription)
        .filter(
            JobDescription.id == jd_id,
            JobDescription.user_email == current_user.email,
        )
        .first()
    )
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")

    db.delete(jd)
    db.commit()
    return {"success": True}
