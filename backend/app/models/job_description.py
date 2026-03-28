from sqlalchemy import Column, BigInteger, Text, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from app.database import Base


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_email = Column(String, nullable=False, index=True)
    role_title = Column(Text)
    raw_text = Column(Text)
    file_url = Column(Text)
    parsed_data = Column(JSONB)
    interview_id = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
