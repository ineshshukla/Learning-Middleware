from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
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
    is_published: Optional[bool] = False


class ModuleInput(BaseModel):
    """Module input for course creation"""
    title: str
    description: Optional[str] = None
    learning_intent: Optional[str] = None


class CourseCreate(CourseBase):
    """Course creation without courseid - will be auto-generated"""
    modules: Optional[List[ModuleInput]] = []


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
    learning_intent: Optional[str] = None
    order_index: int
    content_path: Optional[str] = None


class ModuleCreate(ModuleBase):
    moduleid: str
    courseid: str


class ModuleUpdate(BaseModel):
    """Module update schema for partial updates"""
    title: Optional[str] = None
    description: Optional[str] = None
    learning_intent: Optional[str] = None
    order_index: Optional[int] = None
    content_path: Optional[str] = None


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
    generated_by_kli: Optional[bool] = None
    generated_by_sme: Optional[bool] = None
    edited: Optional[bool] = None
    approved: Optional[bool] = None
    knowledge_component: Optional[str] = None
    learning_process: Optional[str] = None
    instructional_principle: Optional[str] = None
    rationale: Optional[str] = None


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


# SME Integration Schemas
class GenerateLORequest(BaseModel):
    """Request to generate learning objectives for modules."""
    courseid: str
    module_names: List[str]
    n_los: int = 6


class LOGenerationResponse(BaseModel):
    """Response with generated learning objectives."""
    courseid: str
    module_objectives: Dict[str, List[str]]
    status: str = "success"


class UpdateLORequest(BaseModel):
    """Request to update learning objectives for a module."""
    moduleid: str
    learning_objectives: List[str]


class ApproveLearningObjectivesRequest(BaseModel):
    """Approve the current learning objectives and generate a golden sample."""

    learning_objectives: Optional[List[str]] = None


class GoldenSampleResponse(BaseModel):
    """Golden sample for a module."""

    module_id: str
    module_name: str
    status: str = "not_started"
    golden_sample: str = ""
    subtopics: List[Dict[str, Any]] = []
    sections: Dict[str, str] = {}
    generated_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    source_learning_objectives: List[str] = []


class UpdateGoldenSampleRequest(BaseModel):
    """Update the instructor's editable golden sample markdown."""

    golden_sample: str


class BlueprintModuleResponse(BaseModel):
    """Instructor-side course blueprint summary for a module."""

    moduleid: str
    title: str
    description: Optional[str] = None
    learning_intent: Optional[str] = None
    learning_objectives: List[LearningObjective] = []
    approval_status: str = "not_started"
    golden_sample_status: str = "not_started"
    golden_sample_updated_at: Optional[datetime] = None


class CourseBlueprintResponse(BaseModel):
    """Instructor-side KLI blueprint summary."""

    courseid: str
    course_name: str
    modules: List[BlueprintModuleResponse]


class VectorStoreRequest(BaseModel):
    """Request to create vector store for course."""
    courseid: str


class VectorStoreResponse(BaseModel):
    """Response from vector store creation."""
    courseid: str
    message: str
    status: str = "success"


class FileUploadToSMEResponse(BaseModel):
    """Response from uploading files to SME."""
    courseid: str
    uploaded_files: List[Dict[str, Any]]
    sme_response: Dict[str, Any]
    mongo_file_ids: List[str]
    vector_store_status: Optional[str] = None
    vector_store_message: Optional[str] = None
