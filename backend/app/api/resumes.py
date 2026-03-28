from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.resume import Resume
from app.schemas.resume import ResumeCreate, ResumeResponse
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("/", response_model=ResumeResponse)
def create_resume(
    body: ResumeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = Resume(
        user_email=current_user.email,
        candidate_name=body.candidate_name,
        candidate_email=body.candidate_email,
        file_url=body.file_url,
        parsed_data=body.parsed_data,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("/", response_model=list[ResumeResponse])
def list_resumes(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resumes = (
        db.query(Resume)
        .filter(Resume.user_email == current_user.email)
        .order_by(Resume.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return resumes


@router.get("/count")
def count_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total = (
        db.query(func.count(Resume.id))
        .filter(Resume.user_email == current_user.email)
        .scalar()
    )
    return {"count": total}


@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_email == current_user.email)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_email == current_user.email)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    db.delete(resume)
    db.commit()
    return {"success": True}
