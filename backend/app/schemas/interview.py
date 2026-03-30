from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class InterviewCreate(BaseModel):
    interview_id: str
    job_position: str
    job_description: str
    company_name: str = ""
    company_details: str = ""
    duration: str = "10"
    type: str = ""
    question_list: Any = None
    company_summary: str = ""


class InterviewUpdate(BaseModel):
    job_position: Optional[str] = None
    job_description: Optional[str] = None
    company_name: Optional[str] = None
    company_details: Optional[str] = None
    duration: Optional[str] = None
    type: Optional[str] = None
    question_list: Optional[Any] = None
    company_summary: Optional[str] = None


class InterviewResponse(BaseModel):
    id: int
    interview_id: str
    user_email: str
    job_position: Optional[str] = None
    job_description: Optional[str] = None
    company_name: Optional[str] = None
    company_details: Optional[str] = None
    duration: Optional[str] = None
    type: Optional[str] = None
    question_list: Optional[Any] = None
    company_summary: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class QuestionGenerateRequest(BaseModel):
    jobPosition: str
    jobDescription: str
    duration: str
    type: str
    companyDetails: str = ""


class FeedbackGenerateRequest(BaseModel):
    conversation: str
    interview_id: str
    user_email: str
    call_id: str = ""
    companyDetails: str = ""


class CompanySummaryRequest(BaseModel):
    jobPosition: str
    jobDescription: str
    companyDetails: str


class FeedbackCreate(BaseModel):
    interview_id: str
    user_email: str
    user_name: str = ""
    feedback: Any = None
    transcript: Any = None
    call_id: str = ""


class FeedbackResponse(BaseModel):
    id: int
    interview_id: str
    user_email: str
    user_name: Optional[str] = None
    feedback: Optional[Any] = None
    transcript: Optional[Any] = None
    call_id: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SaveTranscriptRequest(BaseModel):
    callId: str
    interviewId: str
    userEmail: str
    userName: str = ""
