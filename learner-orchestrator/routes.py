"""
Simplified API routes for Learner Orchestrator.
Focus: Module → Quiz → Feedback flow
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pymongo.database import Database
from typing import List, Dict, Any
from datetime import datetime

from app.db.database import get_db, get_mongo_db
from app.db.schemas import (
    ModuleFeedbackCreate, ModuleFeedbackResponse,
    ModuleProgress, QuizSubmission, QuizResult, NextModuleResponse,
    CourseEnrollment, CourseProgressResponse,
    ContentPreferences, CoursePreferencesUpdate,
    ModuleAnalytics, LearnerAnalytics, MessageResponse,
    CourseDiagnosticForm, CourseDiagnosticResponse
)
from services.learning_service import LearningService
from services.feedback_service import FeedbackService
from services.analytics_service import AnalyticsService
from services.diagnostic_service import DiagnosticService

router = APIRouter()

# ============= Diagnostic Endpoints =============

@router.post("/diagnostic", response_model=CourseDiagnosticResponse)
async def submit_course_diagnostic(
    diagnostic: CourseDiagnosticForm,
    db: Session = Depends(get_db)
):
    """
    Submit initial diagnostic form when enrolling in a course.
    This is filled BEFORE starting the first module.
    SME uses this to generate the first module.
    """
    service = DiagnosticService(db)
    result = await service.submit_diagnostic(diagnostic)
    return result


@router.get("/diagnostic/{learner_id}/{course_id}", response_model=CourseDiagnosticResponse)
async def get_course_diagnostic(
    learner_id: str,
    course_id: str,
    db: Session = Depends(get_db)
):
    """
    Get the diagnostic form submitted for a course.
    """
    service = DiagnosticService(db)
    result = await service.get_diagnostic(learner_id, course_id)
    if not result:
        raise HTTPException(status_code=404, detail="Diagnostic not found")
    return result


@router.put("/diagnostic/{learner_id}/{course_id}", response_model=CourseDiagnosticResponse)
async def update_course_diagnostic(
    learner_id: str,
    course_id: str,
    diagnostic: CourseDiagnosticForm,
    db: Session = Depends(get_db)
):
    """
    Update diagnostic preferences.
    Useful if learner wants to change generation style mid-course.
    """
    service = DiagnosticService(db)
    result = await service.update_diagnostic(learner_id, course_id, diagnostic)
    return result


# ============= Learning Flow Endpoints =============

@router.get("/module/current/{learner_id}/{course_id}", response_model=ModuleProgress)
async def get_current_module(
    learner_id: str,
    course_id: str,
    db: Session = Depends(get_db),
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Get the current module for a learner in a course.
    Returns module content from MongoDB.
    """
    service = LearningService(db, mongo_db)
    module = await service.get_current_module(learner_id, course_id)
    return module


@router.post("/quiz/submit", response_model=QuizResult)
async def submit_quiz(
    submission: QuizSubmission,
    db: Session = Depends(get_db),
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Submit quiz answers and get scored result.
    Updates Quiz table with score and status.
    """
    service = LearningService(db, mongo_db)
    result = await service.submit_quiz(submission)
    return result


@router.post("/module/complete", response_model=NextModuleResponse)
async def complete_module(
    learner_id: str,
    course_id: str,
    module_id: str,
    db: Session = Depends(get_db),
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Mark module as complete and get next module information.
    Updates CourseContent table.
    """
    service = LearningService(db, mongo_db)
    next_module = await service.complete_module(learner_id, course_id, module_id)
    return next_module


@router.get("/progress/{learner_id}/{course_id}", response_model=CourseProgressResponse)
async def get_course_progress(
    learner_id: str,
    course_id: str,
    db: Session = Depends(get_db),
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Get overall course progress for a learner.
    """
    service = LearningService(db, mongo_db)
    progress = await service.get_course_progress(learner_id, course_id)
    return progress


# ============= Feedback Endpoints =============

@router.post("/feedback", response_model=ModuleFeedbackResponse)
async def submit_module_feedback(
    feedback: ModuleFeedbackCreate,
    db: Session = Depends(get_db),
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Submit feedback after completing a module.
    This feedback is used by SME to generate next module content.
    """
    service = FeedbackService(db, mongo_db)
    result = await service.submit_feedback(feedback)
    return result


@router.get("/feedback/{learner_id}/{course_id}", response_model=List[ModuleFeedbackResponse])
async def get_learner_feedback_history(
    learner_id: str,
    course_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all feedback submissions for a learner in a course.
    """
    service = FeedbackService(db, None)
    feedback_list = await service.get_feedback_history(learner_id, course_id)
    return feedback_list


@router.get("/feedback/module/{module_id}", response_model=List[ModuleFeedbackResponse])
async def get_module_feedback(
    module_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all feedback for a specific module (for SME to review).
    """
    service = FeedbackService(db, None)
    feedback_list = await service.get_module_feedback(module_id)
    return feedback_list


# ============= Preferences Endpoints =============

@router.put("/preferences", response_model=MessageResponse)
async def update_preferences(
    prefs: CoursePreferencesUpdate,
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Update learner's content preferences for a course.
    Stored in MongoDB: CourseContent_Pref collection.
    """
    collection = mongo_db["coursecontent_pref"]
    
    result = collection.update_one(
        {"_id": {"CourseID": prefs.course_id, "LearnerID": prefs.learner_id}},
        {
            "$set": {
                "preferences": prefs.preferences.dict(),
                "lastUpdated": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return MessageResponse(
        message="Preferences updated successfully",
        data={"matched": result.matched_count, "modified": result.modified_count}
    )


@router.get("/preferences/{learner_id}/{course_id}", response_model=Dict[str, Any])
async def get_preferences(
    learner_id: str,
    course_id: str,
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Get learner's content preferences for a course.
    """
    collection = mongo_db["coursecontent_pref"]
    
    prefs = collection.find_one({"_id": {"CourseID": course_id, "LearnerID": learner_id}})
    
    if not prefs:
        # Return defaults
        return {
            "preferences": ContentPreferences().dict(),
            "message": "Using default preferences"
        }
    
    return prefs


# ============= Analytics Endpoints =============

@router.get("/analytics/module/{module_id}", response_model=ModuleAnalytics)
async def get_module_analytics(
    module_id: str,
    db: Session = Depends(get_db)
):
    """
    Get analytics for a specific module.
    Shows completion rate, average scores, common preferences.
    """
    service = AnalyticsService(db)
    analytics = await service.get_module_analytics(module_id)
    return analytics


@router.get("/analytics/learner/{learner_id}", response_model=LearnerAnalytics)
async def get_learner_analytics(
    learner_id: str,
    db: Session = Depends(get_db)
):
    """
    Get analytics for a specific learner.
    Shows courses, modules, quizzes, preferences.
    """
    service = AnalyticsService(db)
    analytics = await service.get_learner_analytics(learner_id)
    return analytics


# ============= Health Check =============

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "learner-orchestrator"}
