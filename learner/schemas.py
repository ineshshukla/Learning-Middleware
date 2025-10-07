from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# Pydantic models for request/response
class LearnerBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class LearnerCreate(LearnerBase):
    password: str


class LearnerLogin(BaseModel):
    email: EmailStr
    password: str


class LearnerResponse(LearnerBase):
    learnerid: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    learner_id: Optional[str] = None