"""
Pydantic schemas for request/response validation in Learner Orchestrator.

SIMPLIFIED PROFILING:
- NO ModuleFeedback schemas (removed)
- NO CourseDiagnostic schemas (removed)
- Profiling uses ONLY 3 ContentPreferences fields in MongoDB

Schemas organized by domain:
- Learning Flow (modules, quizzes)
- Content Preferences (MongoDB - ONLY profiling data)
- Analytics

Usage:
    from app.db.schemas import ContentPreferences, QuizSubmission
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


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


class QuestionResult(BaseModel):
    """Result for individual question"""
    questionNo: str
    question: str
    options: List[str]
    selectedOption: str
    correctAnswer: str
    isCorrect: bool
    explanation: Optional[str] = None


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
    question_results: Optional[List[QuestionResult]] = None


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


# ============= Preference Schemas (MongoDB) =============
# ONLY 3 fields used for profiling - no diagnostic forms, no feedback forms

class ContentPreferences(BaseModel):
    """
    Learner's content preferences (stored in MongoDB CourseContent_Pref collection).
    These are the ONLY 3 fields used to profile learners and generate content.
    """
    DetailLevel: str = Field(
        default="moderate", 
        description="Content detail level: detailed | moderate | brief"
    )
    ExplanationStyle: str = Field(
        default="conceptual", 
        description="Explanation approach: examples-heavy | conceptual | practical | visual"
    )
    Language: str = Field(
        default="balanced", 
        description="Language complexity: simple | technical | balanced"
    )


class CoursePreferencesUpdate(BaseModel):
    """Update preferences for a course"""
    course_id: str
    learner_id: str
    preferences: ContentPreferences


# ============= Analytics Schemas =============

class ModuleAnalytics(BaseModel):
    """Analytics for a specific module - objective performance metrics only"""
    module_id: str
    total_attempts: int
    completions: int
    completion_rate: float
    average_quiz_score: float
    quiz_attempts: int


class LearnerAnalytics(BaseModel):
    """Analytics for a specific learner - objective performance metrics only"""
    learner_id: str
    courses_enrolled: int
    modules_completed: int
    quizzes_completed: int
    average_quiz_score: float  # From Quiz.score - objective metric


# ============= Generic Response =============

class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    success: bool = True
    data: Optional[Dict[str, Any]] = None
