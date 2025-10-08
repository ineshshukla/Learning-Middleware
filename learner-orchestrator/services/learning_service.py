"""
Learning Service - Handles module flow, quiz submission, and progression.
"""

from sqlalchemy.orm import Session
from pymongo.database import Database
from typing import Dict, Any, Optional
from datetime import datetime

from app.db.schemas import (
    ModuleProgress, QuizSubmission, QuizResult,
    NextModuleResponse, CourseProgressResponse
)


class LearningService:
    """Service for managing learning flow"""
    
    def __init__(self, db: Session, mongo_db: Database):
        self.db = db
        self.mongo_db = mongo_db
    
    async def enroll_learner(self, learner_id: str, course_id: str) -> Dict[str, Any]:
        """
        Enroll learner in course and initialize progress tracking.
        """
        # Check if already enrolled
        from sqlalchemy import text
        
        check_query = text("""
            SELECT id FROM coursecontent 
            WHERE learnerid = :learner_id AND courseid = :course_id
        """)
        
        existing = self.db.execute(
            check_query, 
            {"learner_id": learner_id, "course_id": course_id}
        ).fetchone()
        
        if existing:
            return {"message": "Already enrolled", "course_id": course_id}
        
        # Get first module from MongoDB
        course_content = self.mongo_db["coursecontent"].find_one({
            "_id": {"CourseID": course_id, "LearnerID": learner_id}
        })
        
        first_module = None
        if course_content and "modules" in course_content:
            first_module = course_content["modules"][0]["moduleId"]
        
        # Insert into CourseContent table
        insert_query = text("""
            INSERT INTO coursecontent (courseid, learnerid, currentmodule, status)
            VALUES (:course_id, :learner_id, :current_module, 'ongoing')
            RETURNING id
        """)
        
        result = self.db.execute(
            insert_query,
            {
                "course_id": course_id,
                "learner_id": learner_id,
                "current_module": first_module
            }
        )
        self.db.commit()
        
        return {
            "enrollment_id": result.fetchone()[0],
            "course_id": course_id,
            "current_module": first_module
        }
    
    async def get_current_module(self, learner_id: str, course_id: str) -> ModuleProgress:
        """
        Get the current module for learner with content from MongoDB.
        """
        from sqlalchemy import text
        
        # Get current module from PostgreSQL
        query = text("""
            SELECT currentmodule, status 
            FROM coursecontent 
            WHERE learnerid = :learner_id AND courseid = :course_id
        """)
        
        result = self.db.execute(
            query,
            {"learner_id": learner_id, "course_id": course_id}
        ).fetchone()
        
        if not result:
            raise Exception("Not enrolled in this course")
        
        current_module_id = result[0]
        status = result[1]
        
        # Get module content from MongoDB
        course_content = self.mongo_db["coursecontent"].find_one({
            "_id": {"CourseID": course_id, "LearnerID": learner_id}
        })
        
        if not course_content:
            raise Exception("Course content not found")
        
        # Find the current module in the modules array
        module_data = None
        for module in course_content.get("modules", []):
            if module["moduleId"] == current_module_id:
                module_data = module
                break
        
        if not module_data:
            raise Exception("Module not found")
        
        return ModuleProgress(
            course_id=course_id,
            learner_id=learner_id,
            current_module=current_module_id,
            module_title=module_data.get("title", ""),
            module_content=module_data,
            status=status
        )
    
    async def submit_quiz(self, submission: QuizSubmission) -> QuizResult:
        """
        Submit quiz, calculate score, and update Quiz table.
        """
        # Get quiz content and correct answers from MongoDB
        quiz_content = self.mongo_db["quizcontent"].find_one({
            "QuizID": submission.quiz_id
        })
        
        if not quiz_content:
            raise Exception("Quiz not found")
        
        # Calculate score
        correct_count = 0
        total_questions = len(quiz_content.get("questions", []))
        
        for response in submission.responses:
            question_no = response["questionNo"]
            selected_option = response["selectedOption"]
            
            # Find the correct answer
            for question in quiz_content["questions"]:
                if question["questionNo"] == question_no:
                    if question["correctAnswer"] == selected_option:
                        correct_count += 1
                    break
        
        percentage = (correct_count / total_questions * 100) if total_questions > 0 else 0
        status = "passed" if percentage >= 70 else "failed"
        
        # Save learner responses to MongoDB
        self.mongo_db["learnerresponse"].update_one(
            {"_id": {"QuizID": submission.quiz_id, "LearnerID": submission.learner_id}},
            {
                "$set": {
                    "responses": submission.responses,
                    "submittedAt": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        # Update Quiz table in PostgreSQL
        from sqlalchemy import text
        
        update_query = text("""
            UPDATE quiz 
            SET score = :score, status = :status, updated_at = CURRENT_TIMESTAMP
            WHERE quizid = :quiz_id AND learnerid = :learner_id
        """)
        
        self.db.execute(
            update_query,
            {
                "score": int(percentage),
                "status": status,
                "quiz_id": submission.quiz_id,
                "learner_id": submission.learner_id
            }
        )
        self.db.commit()
        
        feedback = f"You scored {correct_count}/{total_questions}. "
        feedback += "Great job!" if status == "passed" else "Review the material and try again."
        
        return QuizResult(
            quiz_id=submission.quiz_id,
            learner_id=submission.learner_id,
            module_id=submission.module_id,
            score=correct_count,
            total_questions=total_questions,
            percentage=percentage,
            status=status,
            feedback=feedback
        )
    
    async def complete_module(
        self, 
        learner_id: str, 
        course_id: str, 
        module_id: str
    ) -> NextModuleResponse:
        """
        Mark module as complete and determine next module.
        """
        # Get course content from MongoDB
        course_content = self.mongo_db["coursecontent"].find_one({
            "_id": {"CourseID": course_id, "LearnerID": learner_id}
        })
        
        if not course_content:
            raise Exception("Course content not found")
        
        modules = course_content.get("modules", [])
        
        # Find current module index
        current_index = None
        for i, module in enumerate(modules):
            if module["moduleId"] == module_id:
                current_index = i
                # Update module status in MongoDB
                module["status"] = "completed"
                break
        
        if current_index is None:
            raise Exception("Module not found")
        
        # Determine next module
        next_module_id = None
        next_module_title = None
        is_course_complete = False
        
        if current_index + 1 < len(modules):
            next_module = modules[current_index + 1]
            next_module_id = next_module["moduleId"]
            next_module_title = next_module.get("title", "")
            next_module["status"] = "in-progress"
        else:
            is_course_complete = True
        
        # Update MongoDB
        self.mongo_db["coursecontent"].update_one(
            {"_id": {"CourseID": course_id, "LearnerID": learner_id}},
            {
                "$set": {
                    "modules": modules,
                    "currentModule": next_module_id if next_module_id else module_id,
                    "status": "completed" if is_course_complete else "ongoing"
                }
            }
        )
        
        # Update PostgreSQL
        from sqlalchemy import text
        
        update_query = text("""
            UPDATE coursecontent 
            SET currentmodule = :next_module, 
                status = :status,
                updated_at = CURRENT_TIMESTAMP
            WHERE learnerid = :learner_id AND courseid = :course_id
        """)
        
        self.db.execute(
            update_query,
            {
                "next_module": next_module_id if next_module_id else module_id,
                "status": "completed" if is_course_complete else "ongoing",
                "learner_id": learner_id,
                "course_id": course_id
            }
        )
        self.db.commit()
        
        message = "Course completed!" if is_course_complete else f"Moving to next module: {next_module_title}"
        
        return NextModuleResponse(
            course_id=course_id,
            next_module_id=next_module_id,
            next_module_title=next_module_title,
            is_course_complete=is_course_complete,
            message=message
        )
    
    async def get_course_progress(self, learner_id: str, course_id: str) -> CourseProgressResponse:
        """
        Get overall course progress for learner.
        """
        from sqlalchemy import text
        
        # Get from PostgreSQL
        progress_query = text("""
            SELECT currentmodule, status 
            FROM coursecontent 
            WHERE learnerid = :learner_id AND courseid = :course_id
        """)
        
        progress = self.db.execute(
            progress_query,
            {"learner_id": learner_id, "course_id": course_id}
        ).fetchone()
        
        if not progress:
            raise Exception("Not enrolled")
        
        # Count quizzes completed
        quiz_query = text("""
            SELECT COUNT(*) 
            FROM quiz 
            WHERE learnerid = :learner_id AND status = 'completed'
        """)
        
        quizzes_completed = self.db.execute(
            quiz_query,
            {"learner_id": learner_id}
        ).fetchone()[0]
        
        # Get module counts from MongoDB
        course_content = self.mongo_db["coursecontent"].find_one({
            "_id": {"CourseID": course_id, "LearnerID": learner_id}
        })
        
        modules = course_content.get("modules", []) if course_content else []
        total_modules = len(modules)
        modules_completed = sum(1 for m in modules if m.get("status") == "completed")
        
        return CourseProgressResponse(
            course_id=course_id,
            learner_id=learner_id,
            current_module=progress[0],
            status=progress[1],
            modules_completed=modules_completed,
            total_modules=total_modules,
            quizzes_completed=quizzes_completed
        )
