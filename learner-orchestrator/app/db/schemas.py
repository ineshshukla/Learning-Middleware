"""
Pydantic schemas for request/response validation in Learner Orchestrator.

This module defines all Pydantic models used for:
- Request validation (input data)
- Response serialization (output data)
- Data transfer between layers

Schemas are organized by domain:
- Module Feedback
- Course Diagnostics
- Learning Flow (modules, quizzes)
- Content Preferences
- Analytics

Usage:
    from app.db.schemas import ModuleFeedbackCreate, DiagnosticFormSubmit
    
    # In route handler
    @router.post("/feedback", response_model=ModuleFeedbackResponse)
    def submit_feedback(feedback: ModuleFeedbackCreate):
        # feedback is automatically validated
        ...
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============= Module Feedback Schemas =============

class ModuleFeedbackCreate(BaseModel):
    """Feedback collected after module completion"""
    learner_id: str
    course_id: str
    module_id: str
    response_preference: str = Field(
        ..., 
        description="Preferred response style: 'example-heavy', 'brief', 'more-analogies', 'detailed'"
    )
    confidence_level: int = Field(..., ge=1, le=5, description="Confidence level 1-5")
    difficulty_rating: int = Field(..., ge=1, le=5, description="Difficulty rating 1-5")
    additional_notes: Optional[str] = None


class ModuleFeedbackResponse(ModuleFeedbackCreate):
    """Module feedback with ID and timestamp"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============= Learning Flow Schemas =============

class ModuleProgress(BaseModel):
    """Current module and progress info"""
    course_id: str
    learner_id: str
    current_module: str
    module_title: str
    module_content: Dict[str, Any]  # From MongoDB
    status: str  # 'in-progress', 'completed'


class QuizSubmission(BaseModel):
    """Quiz submission from learner"""
    learner_id: str
    quiz_id: str
    module_id: str
    responses: List[Dict[str, Any]]  # [{"questionNo": "q1", "selectedOption": "..."}]


class QuizResult(BaseModel):
    """Quiz result after scoring"""
    quiz_id: str
    learner_id: str
    module_id: str
    score: int
    total_questions: int
    percentage: float
    status: str  # 'passed', 'failed'
    feedback: Optional[str] = None


class NextModuleResponse(BaseModel):
    """Information about the next module"""
    course_id: str
    next_module_id: Optional[str]
    next_module_title: Optional[str]
    is_course_complete: bool
    message: str


# ============= Course Content Schemas =============

class CourseEnrollment(BaseModel):
    """Enroll learner in course"""
    learner_id: str
    course_id: str


class CourseProgressResponse(BaseModel):
    """Course progress overview"""
    course_id: str
    learner_id: str
    current_module: str
    status: str
    modules_completed: int
    total_modules: int
    quizzes_completed: int


# ============= Diagnostic Form Schemas =============

class CourseDiagnosticForm(BaseModel):
    """Initial diagnostic form when enrolling in a course"""
    learner_id: str
    course_id: str
    preferred_generation_style: str = Field(
        ..., 
        description="Preferred content style: 'example-heavy', 'brief', 'detailed', 'more-analogies'"
    )
    current_mastery_level: str = Field(
        ..., 
        description="Current mastery level: 'beginner', 'intermediate', 'advanced'"
    )
    learning_pace: Optional[str] = Field(
        default="moderate", 
        description="Preferred pace: 'slow', 'moderate', 'fast'"
    )
    prior_knowledge: Optional[str] = Field(
        default=None,
        description="What you already know about this subject"
    )
    learning_goals: Optional[str] = Field(
        default=None,
        description="What you want to achieve from this course"
    )


class CourseDiagnosticResponse(CourseDiagnosticForm):
    """Diagnostic form response with ID and timestamps"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============= Preference Schemas (MongoDB) =============

class ContentPreferences(BaseModel):
    """Learner's content preferences (stored in MongoDB)"""
    detail_level: str = Field(default="moderate", description="detailed|moderate|brief")
    explanation_style: str = Field(default="balanced", description="example-heavy|conceptual|practical")
    language: str = Field(default="simple", description="simple|technical|balanced")


class CoursePreferencesUpdate(BaseModel):
    """Update preferences for a course"""
    course_id: str
    learner_id: str
    preferences: ContentPreferences


# ============= Analytics Schemas =============

class ModuleAnalytics(BaseModel):
    """Analytics for a specific module"""
    module_id: str
    completions: int
    average_score: float
    average_confidence: float
    average_difficulty: float
    common_preferences: Dict[str, int]


class LearnerAnalytics(BaseModel):
    """Analytics for a specific learner"""
    learner_id: str
    courses_enrolled: int
    modules_completed: int
    quizzes_completed: int
    average_quiz_score: float
    preferred_response_style: str
    average_confidence: float


# ============= Generic Response =============

class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    success: bool = True
    data: Optional[Dict[str, Any]] = None
