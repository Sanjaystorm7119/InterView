from sqlalchemy import Column, Text, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base
import uuid


class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    call_id = Column(Text)
    status = Column(Text)
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    duration = Column(Integer)
    log_data = Column(JSONB)
    transcript = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
