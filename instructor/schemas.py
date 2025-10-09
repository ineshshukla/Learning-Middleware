from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# Instructor Schemas
class InstructorBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class InstructorCreate(InstructorBase):
    password: str


class InstructorLogin(BaseModel):
    email: EmailStr
    password: str


class InstructorResponse(InstructorBase):
    instructorid: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Course Schemas
class CourseBase(BaseModel):
    course_name: str
    coursedescription: Optional[str] = None
    targetaudience: Optional[str] = None
    prereqs: Optional[str] = None


class CourseCreate(CourseBase):
    courseid: str


class CourseResponse(CourseBase):
    courseid: str
    instructorid: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CourseWithModules(CourseResponse):
    modules: List['ModuleResponse'] = []


# Module Schemas
class ModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    order_index: int
    content_path: Optional[str] = None


class ModuleCreate(ModuleBase):
    moduleid: str
    courseid: str


class ModuleResponse(ModuleBase):
    moduleid: str
    courseid: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Learning Objectives Schema (MongoDB)
class LearningObjective(BaseModel):
    objective_id: str
    text: str
    order_index: int


class LearningObjectivesResponse(BaseModel):
    module_id: str
    objectives: List[LearningObjective]


class AddLearningObjective(BaseModel):
    text: str


class UpdateLearningObjective(BaseModel):
    objective_id: str
    text: str


# File Upload Schemas
class FileMetadata(BaseModel):
    file_id: str
    filename: str
    file_path: str
    file_type: str
    file_size: int
    uploaded_at: datetime


class FileUploadResponse(BaseModel):
    course_id: str
    files: List[FileMetadata]


# Token Schema
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    instructorid: Optional[str] = None