"""
Feedback Service - Handles module feedback collection.
"""

from sqlalchemy.orm import Session
from pymongo.database import Database
from typing import List
from datetime import datetime

from app.db.models import ModuleFeedback
from app.db.schemas import ModuleFeedbackCreate, ModuleFeedbackResponse


class FeedbackService:
    """Service for managing module feedback"""
    
    def __init__(self, db: Session, mongo_db: Database = None):
        self.db = db
        self.mongo_db = mongo_db
    
    async def submit_feedback(self, feedback: ModuleFeedbackCreate) -> ModuleFeedbackResponse:
        """
        Submit feedback after module completion.
        This data is used by SME to generate next module.
        """
        # Create feedback record
        db_feedback = ModuleFeedback(
            learnerid=feedback.learner_id,
            courseid=feedback.course_id,
            moduleid=feedback.module_id,
            response_preference=feedback.response_preference,
            confidence_level=feedback.confidence_level,
            difficulty_rating=feedback.difficulty_rating,
            additional_notes=feedback.additional_notes
        )
        
        self.db.add(db_feedback)
        self.db.commit()
        self.db.refresh(db_feedback)
        
        return ModuleFeedbackResponse(
            id=db_feedback.id,
            learner_id=db_feedback.learnerid,
            course_id=db_feedback.courseid,
            module_id=db_feedback.moduleid,
            response_preference=db_feedback.response_preference,
            confidence_level=db_feedback.confidence_level,
            difficulty_rating=db_feedback.difficulty_rating,
            additional_notes=db_feedback.additional_notes,
            created_at=db_feedback.created_at
        )
    
    async def get_feedback_history(
        self, 
        learner_id: str, 
        course_id: str
    ) -> List[ModuleFeedbackResponse]:
        """
        Get all feedback submissions for a learner in a course.
        """
        feedbacks = self.db.query(ModuleFeedback).filter(
            ModuleFeedback.learnerid == learner_id,
            ModuleFeedback.courseid == course_id
        ).order_by(ModuleFeedback.created_at.desc()).all()
        
        return [
            ModuleFeedbackResponse(
                id=f.id,
                learner_id=f.learnerid,
                course_id=f.courseid,
                module_id=f.moduleid,
                response_preference=f.response_preference,
                confidence_level=f.confidence_level,
                difficulty_rating=f.difficulty_rating,
                additional_notes=f.additional_notes,
                created_at=f.created_at
            )
            for f in feedbacks
        ]
    
    async def get_module_feedback(self, module_id: str) -> List[ModuleFeedbackResponse]:
        """
        Get all feedback for a specific module.
        Used by SME to understand learner preferences.
        """
        feedbacks = self.db.query(ModuleFeedback).filter(
            ModuleFeedback.moduleid == module_id
        ).order_by(ModuleFeedback.created_at.desc()).all()
        
        return [
            ModuleFeedbackResponse(
                id=f.id,
                learner_id=f.learnerid,
                course_id=f.courseid,
                module_id=f.moduleid,
                response_preference=f.response_preference,
                confidence_level=f.confidence_level,
                difficulty_rating=f.difficulty_rating,
                additional_notes=f.additional_notes,
                created_at=f.created_at
            )
            for f in feedbacks
        ]
