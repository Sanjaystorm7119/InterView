from sqlalchemy import Column, BigInteger, Text, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from app.database import Base


class InterviewFeedback(Base):
    __tablename__ = "interview_feedback"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    interview_id = Column(Text, nullable=False, index=True)
    user_email = Column(String, nullable=False)
    user_name = Column(Text)
    feedback = Column(JSON)
    transcript = Column(JSON)
    call_id = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
