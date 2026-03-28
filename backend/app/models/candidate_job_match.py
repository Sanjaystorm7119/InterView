from sqlalchemy import Column, BigInteger, Numeric, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from app.database import Base


class CandidateJobMatch(Base):
    __tablename__ = "candidate_job_matches"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_email = Column(String, nullable=False, index=True)
    resume_id = Column(BigInteger, nullable=False)
    jd_id = Column(BigInteger, nullable=False)
    confidence_score = Column(Numeric)
    skills_score = Column(Numeric)
    experience_score = Column(Numeric)
    semantic_score = Column(Numeric)
    matched_skills = Column(JSONB)
    missing_skills = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
