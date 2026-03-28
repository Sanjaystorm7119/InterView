from sqlalchemy import Column, BigInteger, Text, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from app.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_email = Column(String, nullable=False, index=True)
    candidate_name = Column(Text)
    candidate_email = Column(Text)
    file_url = Column(Text)
    parsed_data = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
