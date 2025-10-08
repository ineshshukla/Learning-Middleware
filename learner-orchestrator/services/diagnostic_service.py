"""
Diagnostic Service - Handles initial course diagnostic assessment.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import datetime

from app.db.models import CourseDiagnostic
from app.db.schemas import CourseDiagnosticForm, CourseDiagnosticResponse


class DiagnosticService:
    """Service for managing course diagnostic assessments"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def submit_diagnostic(self, diagnostic: CourseDiagnosticForm) -> CourseDiagnosticResponse:
        """
        Submit initial diagnostic form when enrolling in course.
        This is filled BEFORE starting the first module.
        """
        # Check if diagnostic already exists using raw SQL
        query = text("""
            SELECT id, learnerid, courseid, preferred_generation_style, 
                   current_mastery_level, learning_pace, prior_knowledge, 
                   learning_goals, created_at, updated_at
            FROM coursediagnostic 
            WHERE learnerid = :learner_id AND courseid = :course_id
        """)
        
        result = self.db.execute(
            query,
            {"learner_id": diagnostic.learner_id, "course_id": diagnostic.course_id}
        ).fetchone()
        
        if result:
            # Update existing diagnostic
            update_query = text("""
                UPDATE coursediagnostic 
                SET preferred_generation_style = :gen_style,
                    current_mastery_level = :mastery,
                    learning_pace = :pace,
                    prior_knowledge = :prior,
                    learning_goals = :goals,
                    updated_at = CURRENT_TIMESTAMP
                WHERE learnerid = :learner_id AND courseid = :course_id
                RETURNING id, learnerid, courseid, preferred_generation_style, 
                          current_mastery_level, learning_pace, prior_knowledge, 
                          learning_goals, created_at, updated_at
            """)
            
            updated = self.db.execute(
                update_query,
                {
                    "gen_style": diagnostic.preferred_generation_style,
                    "mastery": diagnostic.current_mastery_level,
                    "pace": diagnostic.learning_pace,
                    "prior": diagnostic.prior_knowledge,
                    "goals": diagnostic.learning_goals,
                    "learner_id": diagnostic.learner_id,
                    "course_id": diagnostic.course_id
                }
            ).fetchone()
            self.db.commit()
            
            return CourseDiagnosticResponse(
                id=updated[0],
                learner_id=updated[1],
                course_id=updated[2],
                preferred_generation_style=updated[3],
                current_mastery_level=updated[4],
                learning_pace=updated[5],
                prior_knowledge=updated[6],
                learning_goals=updated[7],
                created_at=updated[8],
                updated_at=updated[9]
            )
        
        # Create new diagnostic
        insert_query = text("""
            INSERT INTO coursediagnostic 
                (learnerid, courseid, preferred_generation_style, current_mastery_level, 
                 learning_pace, prior_knowledge, learning_goals)
            VALUES (:learner_id, :course_id, :gen_style, :mastery, :pace, :prior, :goals)
            RETURNING id, learnerid, courseid, preferred_generation_style, 
                      current_mastery_level, learning_pace, prior_knowledge, 
                      learning_goals, created_at, updated_at
        """)
        
        new_diagnostic = self.db.execute(
            insert_query,
            {
                "learner_id": diagnostic.learner_id,
                "course_id": diagnostic.course_id,
                "gen_style": diagnostic.preferred_generation_style,
                "mastery": diagnostic.current_mastery_level,
                "pace": diagnostic.learning_pace,
                "prior": diagnostic.prior_knowledge,
                "goals": diagnostic.learning_goals
            }
        ).fetchone()
        self.db.commit()
        
        return CourseDiagnosticResponse(
            id=new_diagnostic[0],
            learner_id=new_diagnostic[1],
            course_id=new_diagnostic[2],
            preferred_generation_style=new_diagnostic[3],
            current_mastery_level=new_diagnostic[4],
            learning_pace=new_diagnostic[5],
            prior_knowledge=new_diagnostic[6],
            learning_goals=new_diagnostic[7],
            created_at=new_diagnostic[8],
            updated_at=new_diagnostic[9]
        )
    
    async def get_diagnostic(
        self, 
        learner_id: str, 
        course_id: str
    ) -> Optional[CourseDiagnosticResponse]:
        """
        Get diagnostic form for a learner in a course.
        """
        query = text("""
            SELECT id, learnerid, courseid, preferred_generation_style, 
                   current_mastery_level, learning_pace, prior_knowledge, 
                   learning_goals, created_at, updated_at
            FROM coursediagnostic 
            WHERE learnerid = :learner_id AND courseid = :course_id
        """)
        
        result = self.db.execute(
            query,
            {"learner_id": learner_id, "course_id": course_id}
        ).fetchone()
        
        if not result:
            return None
        
        return CourseDiagnosticResponse(
            id=result[0],
            learner_id=result[1],
            course_id=result[2],
            preferred_generation_style=result[3],
            current_mastery_level=result[4],
            learning_pace=result[5],
            prior_knowledge=result[6],
            learning_goals=result[7],
            created_at=result[8],
            updated_at=result[9]
        )
    
    async def update_diagnostic(
        self,
        learner_id: str,
        course_id: str,
        diagnostic: CourseDiagnosticForm
    ) -> CourseDiagnosticResponse:
        """
        Update diagnostic preferences mid-course.
        """
        # Check if exists
        existing = await self.get_diagnostic(learner_id, course_id)
        
        if not existing:
            # Create if doesn't exist
            return await self.submit_diagnostic(diagnostic)
        
        # Update existing
        update_query = text("""
            UPDATE coursediagnostic 
            SET preferred_generation_style = :gen_style,
                current_mastery_level = :mastery,
                learning_pace = :pace,
                prior_knowledge = :prior,
                learning_goals = :goals,
                updated_at = CURRENT_TIMESTAMP
            WHERE learnerid = :learner_id AND courseid = :course_id
            RETURNING id, learnerid, courseid, preferred_generation_style, 
                      current_mastery_level, learning_pace, prior_knowledge, 
                      learning_goals, created_at, updated_at
        """)
        
        updated = self.db.execute(
            update_query,
            {
                "gen_style": diagnostic.preferred_generation_style,
                "mastery": diagnostic.current_mastery_level,
                "pace": diagnostic.learning_pace,
                "prior": diagnostic.prior_knowledge,
                "goals": diagnostic.learning_goals,
                "learner_id": learner_id,
                "course_id": course_id
            }
        ).fetchone()
        self.db.commit()
        
        return CourseDiagnosticResponse(
            id=updated[0],
            learner_id=updated[1],
            course_id=updated[2],
            preferred_generation_style=updated[3],
            current_mastery_level=updated[4],
            learning_pace=updated[5],
            prior_knowledge=updated[6],
            learning_goals=updated[7],
            created_at=updated[8],
            updated_at=updated[9]
        )
    
    async def get_all_diagnostics_for_course(self, course_id: str) -> list:
        """
        Get all diagnostics for a course (for SME to review learner backgrounds).
        """
        query = text("""
            SELECT id, learnerid, courseid, preferred_generation_style, 
                   current_mastery_level, learning_pace, prior_knowledge, 
                   learning_goals, created_at, updated_at
            FROM coursediagnostic 
            WHERE courseid = :course_id
            ORDER BY created_at DESC
        """)
        
        results = self.db.execute(query, {"course_id": course_id}).fetchall()
        
        return [
            CourseDiagnosticResponse(
                id=row[0],
                learner_id=row[1],
                course_id=row[2],
                preferred_generation_style=row[3],
                current_mastery_level=row[4],
                learning_pace=row[5],
                prior_knowledge=row[6],
                learning_goals=row[7],
                created_at=row[8],
                updated_at=row[9]
            )
            for row in results
        ]
