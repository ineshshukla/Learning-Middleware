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
        
        # Insert enrollment record
        insert_query = text("""
            INSERT INTO coursecontent (learnerid, courseid, currentmodule, status, enrolledat)
            VALUES (:learner_id, :course_id, :current_module, 'enrolled', :enrolled_at)
        """)
        
        self.db.execute(insert_query, {
            "learner_id": learner_id,
            "course_id": course_id,
            "current_module": first_module,
            "enrolled_at": datetime.utcnow()
        })
        self.db.commit()
        
        return {
            "message": "Successfully enrolled",
            "course_id": course_id,
            "first_module": first_module
        }
    
    async def get_current_module(self, learner_id: str, course_id: str) -> ModuleProgress:
        """
        Get current module for learner in specific course.
        """
        from sqlalchemy import text
        
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
            raise ValueError(f"Learner {learner_id} not enrolled in course {course_id}")
        
        current_module = result[0]
        status = result[1]
        
        # Get module content from MongoDB
        course_content = self.mongo_db["coursecontent"].find_one({
            "_id": {"CourseID": course_id, "LearnerID": learner_id}
        })
        
        module_content = {}
        module_title = "Unknown Module"
        
        if course_content and "modules" in course_content:
            for module in course_content["modules"]:
                if module.get("moduleId") == current_module:
                    module_content = module
                    module_title = module.get("title", "Unknown Module")
                    break
        
        return ModuleProgress(
            course_id=course_id,
            learner_id=learner_id,
            current_module=current_module,
            module_title=module_title,
            module_content=module_content,
            status=status
        )
    
    async def submit_quiz(self, submission: QuizSubmission) -> QuizResult:
        """
        Submit quiz and calculate score.
        """
        # Get quiz from MongoDB
        quiz = self.mongo_db["quizzes"].find_one({"quiz_id": submission.quiz_id})
        
        if not quiz:
            raise ValueError(f"Quiz {submission.quiz_id} not found")
        
        # Debug: Print the quiz structure to understand nesting
        print(f"[DEBUG] Quiz structure for {submission.quiz_id}:")
        print(f"[DEBUG] Quiz keys: {list(quiz.keys())}")
        if "quiz_data" in quiz:
            print(f"[DEBUG] quiz_data keys: {list(quiz['quiz_data'].keys())}")
            if "quiz_data" in quiz["quiz_data"]:
                print(f"[DEBUG] Nested quiz_data keys: {list(quiz['quiz_data']['quiz_data'].keys())}")
        
        # Extract questions from nested quiz_data structure - try multiple levels
        quiz_questions = []
        if quiz.get("quiz_data", {}).get("quiz_data", {}).get("questions"):
            # Triple nested (cached quiz)
            quiz_questions = quiz["quiz_data"]["quiz_data"]["questions"]
            print(f"[DEBUG] Found questions at triple nesting level: {len(quiz_questions)}")
        elif quiz.get("quiz_data", {}).get("questions"):
            # Double nested (fresh quiz)  
            quiz_questions = quiz["quiz_data"]["questions"]
            print(f"[DEBUG] Found questions at double nesting level: {len(quiz_questions)}")
        elif quiz.get("questions"):
            # Single level
            quiz_questions = quiz["questions"]
            print(f"[DEBUG] Found questions at single level: {len(quiz_questions)}")
        else:
            print(f"[DEBUG] No questions found at any nesting level")
        
        # Calculate score
        correct_answers = 0
        total_questions = len(quiz_questions)
        
        if total_questions == 0:
            raise ValueError(f"Quiz {submission.quiz_id} has no questions")
        
        # Create answer key from quiz
        answer_key = {}
        for question in quiz_questions:
            question_id = question.get("id") or question.get("questionNo")
            correct_option = question.get("correct_answer") or question.get("correctAnswer") or question.get("answer")
            if question_id and correct_option:
                answer_key[str(question_id)] = correct_option
        
        print(f"[DEBUG] Answer key created: {answer_key}")
        print(f"[DEBUG] User responses: {[{'questionNo': r.get('questionNo'), 'selectedOption': r.get('selectedOption')} for r in submission.responses]}")
        
        # Score responses
        for response in submission.responses:
            question_id = str(response.get("questionNo"))
            selected_option = response.get("selectedOption")
            
            # Extract just the letter from selected option (e.g., "B) Text..." -> "B")
            selected_letter = None
            if selected_option:
                # Handle format like "B) Option text" or just "B"
                if selected_option.strip().startswith(tuple("ABCDEFGHIJKLMNOPQRSTUVWXYZ")) and ")" in selected_option:
                    selected_letter = selected_option.strip().split(")")[0].strip()
                else:
                    selected_letter = selected_option.strip()
            
            correct_answer = answer_key.get(question_id)
            
            print(f"[DEBUG] Scoring Q{question_id}: selected='{selected_option}' -> letter='{selected_letter}', correct='{correct_answer}'")
            
            if question_id in answer_key and selected_letter == correct_answer:
                correct_answers += 1
                print(f"[DEBUG] ✅ Correct answer for Q{question_id}")
            else:
                print(f"[DEBUG] ❌ Wrong answer for Q{question_id}")
                
        percentage = round((correct_answers / total_questions) * 100, 2)
        print(f"[DEBUG] Final score: {correct_answers}/{total_questions} ({percentage}%)")
        
        # Create detailed question results for frontend display
        question_results = []
        for question in quiz_questions:
            question_id = str(question.get("id") or question.get("questionNo"))
            question_text = question.get("question", "")
            options = question.get("options", [])
            correct_answer = question.get("correct_answer") or question.get("correctAnswer") or question.get("answer")
            explanation = question.get("explanation", "")
            
            # Find user's response for this question
            user_response = None
            user_selected_letter = None
            for response in submission.responses:
                if str(response.get("questionNo")) == question_id:
                    user_response = response.get("selectedOption")
                    # Extract letter from user response
                    if user_response:
                        if user_response.strip().startswith(tuple("ABCDEFGHIJKLMNOPQRSTUVWXYZ")) and ")" in user_response:
                            user_selected_letter = user_response.strip().split(")")[0].strip()
                        else:
                            user_selected_letter = user_response.strip()
                    break
            
            if user_response and correct_answer:
                question_results.append({
                    "questionNo": question_id,
                    "question": question_text,
                    "options": options,
                    "selectedOption": user_response,
                    "correctAnswer": correct_answer,
                    "isCorrect": user_selected_letter == correct_answer,
                    "explanation": explanation
                })
        
        # Store result in MongoDB
        quiz_result = {
            "quiz_id": submission.quiz_id,
            "learner_id": submission.learner_id,
            "module_id": submission.module_id,
            "score": correct_answers,
            "total_questions": total_questions,
            "percentage": percentage,
            "responses": submission.responses,
            "question_results": question_results,
            "submitted_at": datetime.utcnow()
        }
        
        self.mongo_db["quiz_results"].insert_one(quiz_result)
        
        # Determine status based on percentage (you can adjust the passing threshold)
        status = "passed" if percentage >= 60.0 else "failed"
        
        return QuizResult(
            quiz_id=submission.quiz_id,
            learner_id=submission.learner_id,
            module_id=submission.module_id,
            score=correct_answers,
            total_questions=total_questions,
            percentage=percentage,
            status=status,
            question_results=question_results
        )
    
    async def complete_module(self, learner_id: str, course_id: str, module_id: str) -> NextModuleResponse:
        """
        Mark module as complete and return next module info.
        """
        # Get course content from MongoDB to find module order
        course_content = self.mongo_db["coursecontent"].find_one({
            "_id": {"CourseID": course_id, "LearnerID": learner_id}
        })
        
        if not course_content or "modules" not in course_content:
            return NextModuleResponse(
                course_id=course_id,
                next_module_id=None,
                next_module_title=None,
                is_course_complete=True,
                message="Course content not found"
            )
        
        modules = course_content["modules"]
        current_module_index = -1
        
        # Find current module index
        for i, module in enumerate(modules):
            if module.get("moduleId") == module_id:
                current_module_index = i
                break
        
        if current_module_index == -1:
            return NextModuleResponse(
                course_id=course_id,
                next_module_id=None,
                next_module_title=None,
                is_course_complete=True,
                message="Module not found in course"
            )
        
        # Check if this is the last module
        is_last_module = current_module_index >= len(modules) - 1
        
        if is_last_module:
            return NextModuleResponse(
                course_id=course_id,
                next_module_id=None,
                next_module_title=None,
                is_course_complete=True,
                message="Course completed successfully!"
            )
        else:
            next_module = modules[current_module_index + 1]
            return NextModuleResponse(
                course_id=course_id,
                next_module_id=next_module.get("moduleId"),
                next_module_title=next_module.get("title") or next_module.get("moduleId"),
                is_course_complete=False,
                message="Next module available"
            )
    
    async def get_next_module(self, learner_id: str, course_id: str, current_module: str) -> NextModuleResponse:
        """
        Determine next module based on quiz performance and course structure.
        """
        # Get course content from MongoDB
        course_content = self.mongo_db["coursecontent"].find_one({
            "_id": {"CourseID": course_id, "LearnerID": learner_id}
        })
        
        if not course_content or "modules" not in course_content:
            return NextModuleResponse(
                has_next=False,
                next_module=None,
                message="Course content not found"
            )
        
        modules = course_content["modules"]
        current_index = None
        
        # Find current module index
        for i, module in enumerate(modules):
            if module.get("moduleId") == current_module:
                current_index = i
                break
        
        if current_index is None:
            return NextModuleResponse(
                has_next=False,
                next_module=None,
                message="Current module not found in course"
            )
        
        # Check if there's a next module
        if current_index + 1 < len(modules):
            next_module = modules[current_index + 1]
            
            # Update learner's current module
            from sqlalchemy import text
            update_query = text("""
                UPDATE coursecontent 
                SET currentmodule = :next_module_id, 
                    status = 'in-progress', 
                    updatedat = :updated_at
                WHERE learnerid = :learner_id AND courseid = :course_id
            """)
            
            self.db.execute(update_query, {
                "next_module_id": next_module["moduleId"],
                "learner_id": learner_id,
                "course_id": course_id,
                "updated_at": datetime.utcnow()
            })
            self.db.commit()
            
            return NextModuleResponse(
                has_next=True,
                next_module=next_module,
                message="Moved to next module"
            )
        else:
            # Course completed
            from sqlalchemy import text
            update_query = text("""
                UPDATE coursecontent 
                SET status = 'completed', 
                    updatedat = :updated_at
                WHERE learnerid = :learner_id AND courseid = :course_id
            """)
            
            self.db.execute(update_query, {
                "learner_id": learner_id,
                "course_id": course_id,
                "updated_at": datetime.utcnow()
            })
            self.db.commit()
            
            return NextModuleResponse(
                has_next=False,
                next_module=None,
                message="Course completed! Well done!"
            )
    
    async def get_course_progress(self, learner_id: str, course_id: str) -> CourseProgressResponse:
        """
        Get overall course progress for learner.
        """
        from sqlalchemy import text
        
        # Get current progress
        query = text("""
            SELECT currentmodule, status, enrolledat, updatedat
            FROM coursecontent 
            WHERE learnerid = :learner_id AND courseid = :course_id
        """)
        
        result = self.db.execute(
            query, 
            {"learner_id": learner_id, "course_id": course_id}
        ).fetchone()
        
        if not result:
            raise ValueError(f"Learner {learner_id} not enrolled in course {course_id}")
        
        current_module, status, enrolled_at, updated_at = result
        
        # Get course structure from MongoDB
        course_content = self.mongo_db["coursecontent"].find_one({
            "_id": {"CourseID": course_id, "LearnerID": learner_id}
        })
        
        total_modules = 0
        completed_modules = 0
        current_module_index = 0
        
        if course_content and "modules" in course_content:
            total_modules = len(course_content["modules"])
            
            for i, module in enumerate(course_content["modules"]):
                if module.get("moduleId") == current_module:
                    current_module_index = i
                    if status == 'completed':
                        completed_modules = total_modules
                    else:
                        completed_modules = i  # Modules before current are completed
                    break
        
        progress_percentage = (completed_modules / total_modules * 100) if total_modules > 0 else 0
        
        return CourseProgressResponse(
            course_id=course_id,
            learner_id=learner_id,
            current_module=current_module,
            total_modules=total_modules,
            completed_modules=completed_modules,
            progress_percentage=progress_percentage,
            status=status,
            enrolled_at=enrolled_at,
            last_updated=updated_at
        )