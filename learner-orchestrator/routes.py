"""
Simplified API routes for Learner Orchestrator.
Focus: Module → Quiz flow with simplified profiling (3 preference fields only)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pymongo.database import Database
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
import logging

from app.db.database import get_db, get_mongo_db

logger = logging.getLogger(__name__)
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


# ============= SME Integration Request Schemas =============

class GenerateModuleRequest(BaseModel):
    """Request to generate module content via SME"""
    course_id: str
    learner_id: str
    module_name: str
    learning_objectives: List[str]
    module_id: str = None  # Optional module ID for module-specific vector store


class GenerateQuizRequest(BaseModel):
    """Request to generate quiz via SME"""
    module_content: str
    module_name: str
    course_id: str  # Required for SME to use correct vector store
    module_id: str = None  # Optional module ID for module-specific vector store

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

@router.get("/modules/{module_id}/learning-objectives", response_model=Dict[str, Any])
async def get_module_learning_objectives(
    module_id: str,
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Fetch learning objectives for a module from MongoDB.
    
    These are stored by the instructor service after LO generation.
    Both services share the same MongoDB instance.
    """
    lo_doc = mongo_db["learning_objectives"].find_one({"module_id": module_id})
    
    if not lo_doc:
        return {
            "module_id": module_id,
            "learning_objectives": [],
            "found": False
        }
    
    # Extract just the text from each LO object
    objectives = lo_doc.get("learning_objectives", [])
    lo_texts = [
        obj.get("text", obj) if isinstance(obj, dict) else str(obj)
        for obj in objectives
    ]
    
    return {
        "module_id": module_id,
        "module_name": lo_doc.get("module_name"),
        "learning_objectives": lo_texts,
        "found": True
    }


@router.post("/sme/generate-module", response_model=Dict[str, Any])
async def generate_module_via_sme(
    request: GenerateModuleRequest,
    db: Session = Depends(get_db),
    mongo_db: Database = Depends(get_mongo_db)
):
    """Generate module content from approved KLI golden samples via personalization."""
    try:
        # Get learner preferences from MongoDB
        profiling_service = ProfilingService(None, mongo_db)
        prefs = await profiling_service.get_preferences(request.learner_id, request.course_id)

        if not request.module_id:
            raise HTTPException(status_code=400, detail="module_id is required for KLI generation")
        
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
        
        # Pull approved LO jobs for this module from KLI pipeline datastore.
        approved_jobs = list(
            mongo_db["kli_pipeline_jobs"].find(
                {
                    "course_id": request.course_id,
                    "module_id": request.module_id,
                    "status": "approved",
                }
            )
        )

        if not approved_jobs:
            raise HTTPException(
                status_code=409,
                detail="No approved golden samples found for this module. Ask instructor to approve LO outputs first.",
            )

        # Keep deterministic ordering by LO id to preserve authoring structure.
        approved_jobs.sort(key=lambda j: str(j.get("lo_id", "")))

        personalized_sections = []
        for job in approved_jobs:
            golden = job.get("golden_sample") or {}
            golden_text = golden.get("golden_sample_markdown")
            subtopics = golden.get("submodules") or []

            if not golden_text or not isinstance(subtopics, list):
                logger.warning(f"Skipping malformed approved job {job.get('job_id')}")
                continue

            result = sme_client.personalize_kli_module(
                course_id=request.course_id,
                module_id=request.module_id,
                golden_sample=golden_text,
                subtopics=subtopics,
                user_profile=user_profile,
            )

            personalized_text = result.get("personalized_module", "")
            if personalized_text:
                lo_text = job.get("lo_text", "Learning Objective")
                personalized_sections.append(f"## {lo_text}\n\n{personalized_text}")

        content = "\n\n---\n\n".join(personalized_sections).strip()

        if not content:
            raise HTTPException(
                status_code=500,
                detail="KLI personalization did not produce module content.",
            )
        
        # Save generated content to PostgreSQL so it persists even if browser disconnects
        if content and request.module_id and request.learner_id:
            try:
                db.execute(
                    text("""
                        INSERT INTO generatedmodulecontent (moduleid, learnerid, courseid, content)
                        VALUES (:module_id, :learner_id, :course_id, :content)
                        ON CONFLICT (moduleid, learnerid)
                        DO UPDATE SET content = :content, updated_at = NOW()
                    """),
                    {
                        "module_id": request.module_id,
                        "learner_id": request.learner_id,
                        "course_id": request.course_id,
                        "content": content
                    }
                )
                db.commit()
                logger.info(f"Saved generated content to DB for module={request.module_id}, learner={request.learner_id}")
            except Exception as db_err:
                logger.error(f"Failed to save content to DB (will still return to client): {db_err}")
                # Don't fail the whole request if DB save fails - content still returns to client
        
        return {
            "success": True,
            "module_name": request.module_name,
            "content": content,
            "learner_id": request.learner_id,
            "course_id": request.course_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate module: {str(e)}")


@router.post("/sme/generate-quiz", response_model=Dict[str, Any])
async def generate_quiz_via_sme(request: GenerateQuizRequest):
    """
    Generate quiz from module content using SME service with optional module-specific context.
    
    Body:
    {
        "module_content": "# Module Title\n\n## Content...",
        "module_name": "Understanding Processor Architecture",
        "course_id": "COURSE_123ABC",
        "module_id": "m1"  // Optional: for module-specific vector store
    }
    """
    try:
        result = sme_client.generate_quiz(
            module_content=request.module_content,
            module_name=request.module_name,
            course_id=request.course_id,
            module_id=request.module_id  # Pass module_id for module-specific vector store
        )
        
        return {
            "success": True,
            "module_name": request.module_name,
            "quiz_data": result,
            "module_id": request.module_id  # Include in response for debugging
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")


@router.get("/sme/health")
async def check_sme_health():
    """Check if SME service is accessible"""
    health = sme_client.health_check()
    return health
