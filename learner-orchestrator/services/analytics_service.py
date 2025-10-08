"""
Simple Analytics Service - Tracks modules and quizzes only.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Dict

from app.db.models import ModuleFeedback
from app.db.schemas import ModuleAnalytics, LearnerAnalytics


class AnalyticsService:
    """Service for simple analytics tracking"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_module_analytics(self, module_id: str) -> ModuleAnalytics:
        """
        Get analytics for a specific module.
        """
        # Get feedback for this module
        feedbacks = self.db.query(ModuleFeedback).filter(
            ModuleFeedback.moduleid == module_id
        ).all()
        
        if not feedbacks:
            return ModuleAnalytics(
                module_id=module_id,
                completions=0,
                average_score=0.0,
                average_confidence=0.0,
                average_difficulty=0.0,
                common_preferences={}
            )
        
        # Calculate averages
        total = len(feedbacks)
        avg_confidence = sum(f.confidence_level for f in feedbacks) / total
        avg_difficulty = sum(f.difficulty_rating for f in feedbacks) / total
        
        # Count preferences
        preferences_count: Dict[str, int] = {}
        for f in feedbacks:
            pref = f.response_preference
            preferences_count[pref] = preferences_count.get(pref, 0) + 1
        
        # Get average quiz score for this module
        quiz_query = text("""
            SELECT AVG(score) as avg_score
            FROM quiz
            WHERE moduleid = :module_id AND status = 'completed'
        """)
        
        result = self.db.execute(quiz_query, {"module_id": module_id}).fetchone()
        avg_score = float(result[0]) if result[0] else 0.0
        
        return ModuleAnalytics(
            module_id=module_id,
            completions=total,
            average_score=avg_score,
            average_confidence=avg_confidence,
            average_difficulty=avg_difficulty,
            common_preferences=preferences_count
        )
    
    async def get_learner_analytics(self, learner_id: str) -> LearnerAnalytics:
        """
        Get analytics for a specific learner.
        """
        # Count enrolled courses
        course_query = text("""
            SELECT COUNT(DISTINCT courseid) as course_count
            FROM coursecontent
            WHERE learnerid = :learner_id
        """)
        
        courses = self.db.execute(course_query, {"learner_id": learner_id}).fetchone()
        courses_enrolled = courses[0] if courses else 0
        
        # Count completed quizzes
        quiz_query = text("""
            SELECT COUNT(*) as quiz_count, AVG(score) as avg_score
            FROM quiz
            WHERE learnerid = :learner_id AND status = 'completed'
        """)
        
        quiz_result = self.db.execute(quiz_query, {"learner_id": learner_id}).fetchone()
        quizzes_completed = quiz_result[0] if quiz_result else 0
        avg_quiz_score = float(quiz_result[1]) if quiz_result and quiz_result[1] else 0.0
        
        # Get feedback data
        feedbacks = self.db.query(ModuleFeedback).filter(
            ModuleFeedback.learnerid == learner_id
        ).all()
        
        modules_completed = len(feedbacks)
        
        if feedbacks:
            avg_confidence = sum(f.confidence_level for f in feedbacks) / len(feedbacks)
            
            # Find most common preference
            pref_count: Dict[str, int] = {}
            for f in feedbacks:
                pref = f.response_preference
                pref_count[pref] = pref_count.get(pref, 0) + 1
            
            preferred_style = max(pref_count, key=pref_count.get) if pref_count else "balanced"
        else:
            avg_confidence = 0.0
            preferred_style = "balanced"
        
        return LearnerAnalytics(
            learner_id=learner_id,
            courses_enrolled=courses_enrolled,
            modules_completed=modules_completed,
            quizzes_completed=quizzes_completed,
            average_quiz_score=avg_quiz_score,
            preferred_response_style=preferred_style,
            average_confidence=avg_confidence
        )
