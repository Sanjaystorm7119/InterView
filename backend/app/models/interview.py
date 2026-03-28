from sqlalchemy import Column, BigInteger, Text, DateTime, func
from sqlalchemy.dialects.postgresql import JSON
from app.database import Base


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    interview_id = Column(Text, unique=True, nullable=False, index=True)
    user_email = Column(Text, nullable=False, index=True)
    job_position = Column(Text)
    job_description = Column(Text)
    company_name = Column(Text)
    company_details = Column(Text)
    duration = Column(Text)
    type = Column(Text)  # JSON array as text
    question_list = Column(JSON)
    company_summary = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
