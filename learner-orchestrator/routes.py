"""
Simplified API routes for Learner Orchestrator.
Focus: Module → Quiz flow with simplified profiling (3 preference fields only)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pymongo.database import Database
from typing import List, Dict, Any
from datetime import datetime

from app.db.database import get_db, get_mongo_db
from app.db.schemas import (
    ModuleProgress, QuizSubmission, QuizResult, NextModuleResponse,
    CourseEnrollment, CourseProgressResponse,
    ContentPreferences, CoursePreferencesUpdate,
    ModuleAnalytics, LearnerAnalytics, MessageResponse
)
from services.learning_service import LearningService
from services.profiling_service import ProfilingService  # Simplified - only 3 preferences
from services.analytics_service import AnalyticsService

router = APIRouter()

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


# ============= Preferences Endpoints (Simplified Profiling - 3 fields only) =============

@router.put("/preferences", response_model=MessageResponse)
async def update_preferences(
    prefs: CoursePreferencesUpdate,
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Update learner's 3 content preferences for a course.
    Fields: DetailLevel, ExplanationStyle, Language
    Stored in MongoDB: CourseContent_Pref collection.
    """
    service = ProfilingService(None, mongo_db)
    result = await service.update_preferences(
        prefs.learner_id,
        prefs.course_id,
        prefs.preferences
    )
    return MessageResponse(
        message=result["message"],
        data=result
    )


@router.get("/preferences/{learner_id}/{course_id}", response_model=Dict[str, Any])
async def get_preferences(
    learner_id: str,
    course_id: str,
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Get learner's 3 content preferences for a course.
    Returns defaults if not set: DetailLevel=moderate, ExplanationStyle=conceptual, Language=balanced
    """
    service = ProfilingService(None, mongo_db)
    result = await service.get_preferences(learner_id, course_id)
    return result


# ============= Analytics Endpoints =============

@router.get("/analytics/module/{module_id}", response_model=ModuleAnalytics)
async def get_module_analytics(
    module_id: str,
    db: Session = Depends(get_db),
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Get analytics for a specific module.
    Shows completion rate, average scores (objective metrics only).
    """
    service = AnalyticsService(db, mongo_db)
    analytics = service.get_module_analytics(module_id)
    return analytics


@router.get("/analytics/learner/{learner_id}", response_model=LearnerAnalytics)
async def get_learner_analytics(
    learner_id: str,
    db: Session = Depends(get_db),
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Get analytics for a specific learner.
    Shows courses, modules, quizzes (objective metrics only).
    """
    service = AnalyticsService(db, mongo_db)
    analytics = service.get_learner_analytics(learner_id)
    return analytics


# ============= Health Check =============

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "learner-orchestrator"}
