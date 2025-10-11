"""
Profiling Service - Manages learner content preferences.

SIMPLIFIED PROFILING:
- NO CourseDiagnostic (removed)
- NO ModuleFeedback (removed)
- ONLY 3 MongoDB preference fields:
  1. DetailLevel: "detailed" | "moderate" | "brief"
  2. ExplanationStyle: "examples-heavy" | "conceptual" | "practical" | "visual"
  3. Language: "simple" | "technical" | "balanced"

These preferences are used by SME to generate personalized content.
"""

from typing import Dict, Any
from datetime import datetime

from app.db.schemas import ContentPreferences


class ProfilingService:
    """
    Service for managing learner content preferences (MongoDB only).
    
    Handles updating and retrieving the 3 preference fields that control
    content generation by the SME service.
    """
    
    def __init__(self, db=None, mongo_db=None):
        self.mongo_db = mongo_db
        # db parameter kept for backward compatibility but not used
    
    async def update_preferences(
        self,
        learner_id: str,
        course_id: str,
        preferences: ContentPreferences
    ) -> Dict[str, Any]:
        """
        Update learner's content preferences for a course.
        
        Args:
            learner_id: Learner identifier
            course_id: Course identifier
            preferences: ContentPreferences with 3 fields
        
        Returns:
            Dict with success message and update stats
        """
        if self.mongo_db is None:
            raise ValueError("MongoDB connection required for preferences")
        
        collection = self.mongo_db["coursecontent_pref"]
        
        result = collection.update_one(
            {
                "_id": {
                    "CourseID": course_id,
                    "LearnerID": learner_id
                }
            },
            {
                "$set": {
                    "preferences": {
                        "DetailLevel": preferences.DetailLevel,
                        "ExplanationStyle": preferences.ExplanationStyle,
                        "Language": preferences.Language
                    },
                    "lastUpdated": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return {
            "message": "Preferences updated successfully",
            "matched": result.matched_count,
            "modified": result.modified_count,
            "upserted": result.upserted_id is not None
        }
    
    async def get_preferences(
        self,
        learner_id: str,
        course_id: str
    ) -> Dict[str, Any]:
        """
        Get learner's content preferences for a course.
        
        Args:
            learner_id: Learner identifier
            course_id: Course identifier
        
        Returns:
            Dict with preferences or defaults
        """
        if self.mongo_db is None:
            raise ValueError("MongoDB connection required for preferences")
        
        collection = self.mongo_db["coursecontent_pref"]
        
        prefs = collection.find_one({
            "_id": {
                "CourseID": course_id,
                "LearnerID": learner_id
            }
        })
        
        if not prefs:
            # Return defaults
            return {
                "preferences": {
                    "DetailLevel": "moderate",
                    "ExplanationStyle": "conceptual",
                    "Language": "balanced"
                },
                "message": "Using default preferences"
            }
        
        return prefs
