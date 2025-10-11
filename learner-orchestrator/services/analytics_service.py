"""
Analytics Service - Calculates stats from ACTUAL DATA (schema.md compliant).

This service provides analytics calculated ONLY from:
1. Quiz.Score (PostgreSQL)
2. CourseContent.modules.status (MongoDB)
3. Quiz.Status (PostgreSQL)

NO user-reported confidence/difficulty ratings (not in schema.md).
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict
from app.db.schemas import ModuleAnalytics, LearnerAnalytics


class AnalyticsService:
    """Service for calculating analytics from quiz scores and module completion."""
    
    def __init__(self, db: Session, mongo_db):
        self.db = db
        self.mongo_db = mongo_db
    
    def get_module_analytics(self, module_id: str) -> ModuleAnalytics:
        """
        Get analytics for a specific module.
        
        Calculates from:
        - Quiz table: Score and Status
        - CourseContent MongoDB: module status
        
        Args:
            module_id: Module identifier (e.g., "CSE101_M1")
        
        Returns:
            ModuleAnalytics with actual data
        """
        # Get quiz statistics for this module
        quiz_query = text("""
            SELECT 
                COUNT(*) as quiz_attempts,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as quiz_completions,
                AVG(CASE WHEN status = 'completed' THEN score ELSE NULL END) as avg_score
            FROM quiz
            WHERE moduleid = :module_id
        """)
        
        quiz_result = self.db.execute(quiz_query, {"module_id": module_id}).fetchone()
        
        # Get module completion statistics from MongoDB
        coursecontent_collection = self.mongo_db["coursecontent"]
        
        # Count total attempts (learners who have this module in their course)
        total_attempts = coursecontent_collection.count_documents({
            "modules.moduleId": module_id
        })
        
        # Count completions (learners who completed this module)
        completions = coursecontent_collection.count_documents({
            "modules": {
                "$elemMatch": {
                    "moduleId": module_id,
                    "status": "completed"
                }
            }
        })
        
        # Calculate completion rate
        completion_rate = (completions / total_attempts * 100) if total_attempts > 0 else 0.0
        
        return ModuleAnalytics(
            module_id=module_id,
            total_attempts=total_attempts,
            completions=completions,
            completion_rate=round(completion_rate, 2),
            average_quiz_score=round(float(quiz_result.avg_score or 0), 2),
            quiz_attempts=int(quiz_result.quiz_attempts or 0)
        )
    
    def get_learner_analytics(self, learner_id: str) -> LearnerAnalytics:
        """
        Get analytics for a specific learner.
        
        Calculates from:
        - CourseContent (PostgreSQL): courses enrolled
        - CourseContent (MongoDB): modules completed
        - Quiz (PostgreSQL): quiz completion and scores
        
        Args:
            learner_id: Learner identifier (UUID)
        
        Returns:
            LearnerAnalytics with actual data
        """
        # Get course enrollment count from PostgreSQL
        enrollment_query = text("""
            SELECT COUNT(DISTINCT courseid) as courses_enrolled
            FROM coursecontent
            WHERE learnerid = :learner_id
        """)
        
        enrollment_result = self.db.execute(
            enrollment_query,
            {"learner_id": learner_id}
        ).fetchone()
        
        # Get quiz statistics from PostgreSQL
        quiz_query = text("""
            SELECT 
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as quizzes_completed,
                AVG(CASE WHEN status = 'completed' THEN score ELSE NULL END) as avg_score
            FROM quiz
            WHERE learnerid = :learner_id
        """)
        
        quiz_result = self.db.execute(quiz_query, {"learner_id": learner_id}).fetchone()
        
        # Get module completion count from MongoDB
        coursecontent_collection = self.mongo_db["coursecontent"]
        
        # Aggregate completed modules across all courses
        pipeline = [
            {"$match": {"_id.LearnerID": learner_id}},
            {"$unwind": "$modules"},
            {"$match": {"modules.status": "completed"}},
            {"$count": "completed_count"}
        ]
        
        agg_result = list(coursecontent_collection.aggregate(pipeline))
        modules_completed = agg_result[0]["completed_count"] if agg_result else 0
        
        return LearnerAnalytics(
            learner_id=learner_id,
            courses_enrolled=int(enrollment_result.courses_enrolled or 0),
            modules_completed=modules_completed,
            quizzes_completed=int(quiz_result.quizzes_completed or 0),
            average_quiz_score=round(float(quiz_result.avg_score or 0), 2)
        )
