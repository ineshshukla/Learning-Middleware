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
    order_index: int
    content_path: Optional[str] = None


class ModuleCreate(ModuleBase):
    moduleid: str
    courseid: str


class ModuleUpdate(BaseModel):
    """Module update schema for partial updates"""
    title: Optional[str] = None
    description: Optional[str] = None
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


# KLI Pipeline Schemas
class KliPipelineInitRequest(BaseModel):
    """Initialize async KLI pipeline jobs for all module LOs in a course."""
    reset_existing: bool = False


class KliJobSummary(BaseModel):
    """Single LO pipeline job summary."""
    job_id: str
    course_id: str
    module_id: str
    module_title: Optional[str] = None
    lo_id: str
    lo_text: str
    status: str
    stage: str
    created_at: datetime
    updated_at: datetime
    approved: bool = False
    plan_ready: bool = False
    golden_ready: bool = False
    error: Optional[str] = None


class KliJobDetailResponse(KliJobSummary):
    """Detailed LO job payload for instructor review screens."""
    plan: Optional[Dict[str, Any]] = None
    golden_sample: Optional[Dict[str, Any]] = None
    review: Optional[Dict[str, Any]] = None


class KliPipelineInitResponse(BaseModel):
    """Response after queueing KLI jobs for a course."""
    courseid: str
    queued_jobs: int
    skipped_jobs: int
    status: str
    message: str
    jobs: List[KliJobSummary]


class KliCoursePipelineStatusResponse(BaseModel):
    """Aggregated per-course KLI pipeline status with per-LO details."""
    courseid: str
    total_jobs: int
    queued_jobs: int
    in_progress_jobs: int
    review_pending_jobs: int
    approved_jobs: int
    failed_jobs: int
    current_job: Optional[KliJobSummary] = None
    jobs: List[KliJobSummary]


class KliJobUpdateRequest(BaseModel):
    """State update for a KLI LO job (worker/internal tooling endpoint)."""
    status: str
    stage: Optional[str] = None
    plan: Optional[Dict[str, Any]] = None
    golden_sample: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class KliPlanReviewRequest(BaseModel):
    """Instructor review payload for quorum-generated plan."""
    approved: bool
    edited_plan: Optional[Dict[str, Any]] = None
    review_notes: Optional[str] = None


class KliGoldenReviewRequest(BaseModel):
    """Instructor review payload for golden sample."""
    approved: bool
    edited_golden_sample: Optional[Dict[str, Any]] = None
    review_notes: Optional[str] = None


class KliContentGenerationResponse(BaseModel):
    """Response after triggering module-content assembly from approved KLI outputs."""
    courseid: str
    status: str
    message: str
    generated_modules: int = 0