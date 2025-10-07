from pydantic import BaseModel, EmailStr
from typing import Optional, List
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


# Course related schemas
class ModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: int
    content_path: Optional[str] = None


class ModuleResponse(ModuleBase):
    moduleid: str
    courseid: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CourseBase(BaseModel):
    course_name: str
    coursedescription: Optional[str] = None
    targetaudience: Optional[str] = None
    prereqs: Optional[str] = None


class CourseResponse(CourseBase):
    courseid: str
    instructorid: str
    created_at: datetime
    updated_at: datetime
    modules: Optional[List[ModuleResponse]] = []
    
    class Config:
        from_attributes = True


class CourseEnrollRequest(BaseModel):
    courseid: str


class EnrollmentResponse(BaseModel):
    id: int
    learnerid: str
    courseid: str
    enrollment_date: datetime
    status: str
    course: Optional[CourseResponse] = None
    
    class Config:
        from_attributes = True


class ModuleProgressBase(BaseModel):
    status: Optional[str] = "not_started"
    progress_percentage: Optional[int] = 0


class ModuleProgressResponse(ModuleProgressBase):
    id: int
    learnerid: str
    moduleid: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CourseProgressResponse(BaseModel):
    courseid: str
    learnerid: str
    currentmodule: Optional[str] = None
    status: str
    course: Optional[CourseResponse] = None
    modules_progress: Optional[List[ModuleProgressResponse]] = []
    
    class Config:
        from_attributes = True


class LearnerDashboardResponse(BaseModel):
    learner: LearnerResponse
    enrolled_courses: List[EnrollmentResponse]
    course_progress: List[CourseProgressResponse]
    
    class Config:
        from_attributes = True