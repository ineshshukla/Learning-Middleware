"""
Simplified API routes for Learner Orchestrator.
Focus: Module → Quiz flow with simplified profiling (3 preference fields only)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pymongo.database import Database
from typing import List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from app.db.database import get_db, get_mongo_db
from app.db.schemas import (
    ModuleProgress, QuizSubmission, QuizResult, NextModuleResponse,
    CourseEnrollment, CourseProgressResponse,
    ContentPreferences, CoursePreferencesUpdate,
    ModuleAnalytics, LearnerAnalytics, MessageResponse
)
from docs.services.learning_service import LearningService
from docs.services.profiling_service import ProfilingService  # Simplified - only 3 preferences
from docs.services.analytics_service import AnalyticsService
from app.services.sme_client import sme_client

router = APIRouter()


# ============= SME Integration Request Schemas =============

class GenerateModuleRequest(BaseModel):
    """Request to generate module content via SME"""
    course_id: str
    learner_id: str
    module_name: str
    learning_objectives: List[str]


class GenerateQuizRequest(BaseModel):
    """Request to generate quiz via SME"""
    module_content: str
    module_name: str
    course_id: str  # Required for SME to use correct vector store

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


# ============= SME Integration Endpoints =============

@router.post("/sme/generate-module", response_model=Dict[str, Any])
async def generate_module_via_sme(
    request: GenerateModuleRequest,
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Generate module content using SME service.
    
    This endpoint:
    1. Gets learner's preferences from MongoDB
    2. Calls SME to generate personalized module content
    3. Returns the generated markdown content
    
    Body:
    {
        "course_id": "COURSE_123",
        "learner_id": "LEARNER_456",
        "module_name": "Understanding Processor Architecture",
        "learning_objectives": ["LO1", "LO2", "LO3"]
    }
    """
    try:
        # Get learner preferences from MongoDB
        profiling_service = ProfilingService(None, mongo_db)
        prefs = await profiling_service.get_preferences(request.learner_id, request.course_id)
        
        # Prepare user profile for SME
        user_profile = {
            "_id": {
                "CourseID": request.course_id,
                "LearnerID": request.learner_id
            },
            "preferences": prefs.get("preferences", {
                "DetailLevel": "moderate",
                "ExplanationStyle": "conceptual",
                "Language": "balanced"
            }),
            "lastUpdated": datetime.utcnow().isoformat()
        }
        
        # Prepare module LO structure for SME
        module_lo = {
            request.module_name: {
                "learning_objectives": request.learning_objectives
            }
        }
        
        # Call SME to generate module content
        result = sme_client.generate_module_content(
            course_id=request.course_id,
            user_profile=user_profile,
            module_lo=module_lo
        )
        
        return {
            "success": True,
            "module_name": request.module_name,
            "content": result.get(request.module_name, ""),
            "learner_id": request.learner_id,
            "course_id": request.course_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate module: {str(e)}")


@router.post("/sme/generate-quiz", response_model=Dict[str, Any])
async def generate_quiz_via_sme(request: GenerateQuizRequest):
    """
    Generate quiz from module content using SME service.
    
    Body:
    {
        "module_content": "# Module Title\n\n## Content...",
        "module_name": "Understanding Processor Architecture",
        "course_id": "COURSE_123ABC"
    }
    """
    try:
        result = sme_client.generate_quiz(
            module_content=request.module_content,
            module_name=request.module_name,
            course_id=request.course_id
        )
        
        return {
            "success": True,
            "module_name": request.module_name,
            "quiz_data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")


@router.get("/sme/health")
async def check_sme_health():
    """Check if SME service is accessible"""
    health = sme_client.health_check()
    return health
