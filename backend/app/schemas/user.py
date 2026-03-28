from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    picture: Optional[str] = None
    credits: int = 10
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
