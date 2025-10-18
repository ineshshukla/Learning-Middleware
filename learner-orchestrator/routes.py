"""
Simplified API routes for Learner Orchestrator.
Focus: Module → Quiz flow with simplified profiling (3 preference fields only)
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pymongo.database import Database
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

from app.db.database import get_db, get_mongo_db
from app.db.schemas import (
    ModuleProgress, QuizSubmission, QuizResult, NextModuleResponse,
    CourseEnrollment, CourseProgressResponse,
    ContentPreferences, CoursePreferencesUpdate,
    ModuleAnalytics, LearnerAnalytics, MessageResponse
)
from app.services.learning_service import LearningService
from app.services.profiling_service import ProfilingService  # Simplified - only 3 preferences
from app.services.analytics_service import AnalyticsService
from app.services.sme_client import sme_client

router = APIRouter()

# Use Uvicorn's error logger so logs are visible in Docker output
logger = logging.getLogger("uvicorn.error")


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
    learner_id: Optional[str] = None
    module_id: Optional[str] = None
    force_regenerate: bool = False

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


# ============= Learning Objectives Endpoint =============

@router.get("/modules/{module_id}/objectives", response_model=Dict[str, Any])
async def get_module_learning_objectives(
    module_id: str,
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Get learning objectives for a module from MongoDB.
    This endpoint is accessible to learners without authentication.
    
    Returns:
    {
        "module_id": "MODULE_123",
        "learning_objectives": [
            {
                "objective_id": "lo_1",
                "text": "Understand...",
                "order_index": 0
            }
        ]
    }
    """
    try:
        logger.info(f"[DEBUG] Fetching learning objectives for module_id: {module_id}")
        # Get objectives from MongoDB - exclude _id to avoid ObjectId serialization issues
        objectives_doc = mongo_db["learning_objectives"].find_one(
            {"module_id": module_id},
            {"_id": 0}  # Exclude _id field
        )
        
        logger.info(f"[DEBUG] Looking for module_id: {module_id}")
        logger.info(f"[DEBUG] Found document: {objectives_doc}")
        
        if not objectives_doc:
            logger.warning(f"[DEBUG] No document found for module_id: {module_id}")
            # Return empty objectives if not found
            return {
                "module_id": module_id,
                "learning_objectives": []
            }
        
        # Extract objectives list (handle different possible structures)
        objectives = objectives_doc.get("learning_objectives", objectives_doc.get("objectives", []))
        logger.info(f"[DEBUG] Extracted objectives: {objectives}")
        
        # Clean up objectives to remove any non-JSON serializable fields
        clean_objectives = []
        for obj in objectives:
            if isinstance(obj, dict):
                # Create a clean copy without _id or other problematic fields
                clean_obj = {
                    "objective_id": obj.get("objective_id", ""),
                    "text": obj.get("text", ""),
                    "order_index": obj.get("order_index", 0)
                }
                # Include optional fields if they exist
                if "generated_by_sme" in obj:
                    clean_obj["generated_by_sme"] = obj["generated_by_sme"]
                if "edited" in obj:
                    clean_obj["edited"] = obj["edited"]
                clean_objectives.append(clean_obj)
        
        return {
            "module_id": module_id,
            "learning_objectives": clean_objectives
        }
        
    except Exception as e:
        logger.error(f"[DEBUG] Error fetching objectives: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch learning objectives: {str(e)}")


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
        logger.info("Module LO for SME: %s", module_lo)
        
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
async def generate_quiz_via_sme(
    request: GenerateQuizRequest,
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Generate quiz from module content using SME service.
    Stores quiz per learner-module combination for reuse.
    
    Body:
    {
        "module_content": "# Module Title\n\n## Content...",
        "module_name": "Understanding Processor Architecture",
        "learner_id": "user123", 
        "module_id": "module456",
        "force_regenerate": false
    }
    """
    try:
        # Extract course_id from module_id (format: COURSE_XXX_MOD_X)
        course_id = None
        if request.module_id:
            # Extract course ID from module ID (e.g., COURSE_A2F96EB1DE_MOD_1 -> COURSE_A2F96EB1DE)
            parts = request.module_id.split('_MOD_')
            if len(parts) == 2:
                course_id = parts[0]
        
        # Create quiz ID based on learner and module
        quiz_id = f"QUIZ_{request.learner_id}_{request.module_id}_{request.module_name}" if request.learner_id and request.module_id else f"QUIZ_{request.module_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Check if quiz already exists (unless force regenerate)
        if not request.force_regenerate and request.learner_id and request.module_id:
            existing_quiz = mongo_db["quizzes"].find_one({
                "quiz_id": quiz_id,
                "learner_id": request.learner_id,
                "module_id": request.module_id
            })
            
            if existing_quiz:
                return {
                    "success": True,
                    "module_name": request.module_name,
                    "quiz_id": quiz_id,
                    "quiz_data": {
                        "message": f"Retrieved existing quiz for {request.module_name}",
                        "module_name": request.module_name,
                        "quiz_data": existing_quiz["quiz_data"]
                    },
                    "from_cache": True
                }
        
        # Generate new quiz via SME with course_id for vector store context
        result = sme_client.generate_quiz(
            module_content=request.module_content,
            module_name=request.module_name,
            course_id=course_id
        )
        
        # Store quiz in MongoDB for future use
        if request.learner_id and request.module_id:
            quiz_document = {
                "quiz_id": quiz_id,
                "learner_id": request.learner_id,
                "module_id": request.module_id,
                "module_name": request.module_name,
                "quiz_data": result,
                "created_at": datetime.utcnow(),
                "status": "generated"
            }
            
            # Upsert (insert or update) the quiz
            mongo_db["quizzes"].replace_one(
                {
                    "quiz_id": quiz_id,
                    "learner_id": request.learner_id,
                    "module_id": request.module_id
                },
                quiz_document,
                upsert=True
            )
        
        return {
            "success": True,
            "module_name": request.module_name,
            "quiz_id": quiz_id,
            "quiz_data": result,
            "from_cache": False
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")


@router.get("/sme/health")
async def check_sme_health():
    """Check if SME service is accessible"""
    health = sme_client.health_check()
    return health
