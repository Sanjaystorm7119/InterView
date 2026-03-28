from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class ResumeCreate(BaseModel):
    candidate_name: str = ""
    candidate_email: str = ""
    file_url: str = ""
    parsed_data: Any = None


class ResumeResponse(BaseModel):
    id: int
    user_email: str
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    file_url: Optional[str] = None
    parsed_data: Optional[Any] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class JobDescriptionCreate(BaseModel):
    role_title: str = ""
    raw_text: str = ""
    file_url: str = ""
    parsed_data: Any = None
    interview_id: str = ""


class JobDescriptionResponse(BaseModel):
    id: int
    user_email: str
    role_title: Optional[str] = None
    raw_text: Optional[str] = None
    file_url: Optional[str] = None
    parsed_data: Optional[Any] = None
    interview_id: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MatchRequest(BaseModel):
    resume_id: int
    jd_id: int


class MatchResponse(BaseModel):
    id: int
    user_email: str
    resume_id: int
    jd_id: int
    confidence_score: Optional[float] = None
    skills_score: Optional[float] = None
    experience_score: Optional[float] = None
    semantic_score: Optional[float] = None
    matched_skills: Optional[Any] = None
    missing_skills: Optional[Any] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SendEmailRequest(BaseModel):
    candidate_email: str
    candidate_name: str = ""
    role_title: str
    company_name: str = ""
    interview_id: str = ""
