from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func, desc
from models import (
    Learner, Course, Module, EnrolledCourse, 
    CourseContent, LearnerModuleProgress, GeneratedModuleContent, GeneratedQuiz, ChatLog,
    ModuleFeedback, QuizFeedback
)
from schemas import LearnerCreate, CourseEnrollRequest
from auth import hash_password, verify_password
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime


class LearnerCRUD:
    @staticmethod
    def create_learner(db: Session, learner: LearnerCreate) -> Learner:
        """Create a new learner."""
        learner_id = str(uuid.uuid4())
        hashed_password = hash_password(learner.password)
        
        db_learner = Learner(
            learnerid=learner_id,
            email=learner.email,
            password_hash=hashed_password,
            first_name=learner.first_name,
            last_name=learner.last_name
        )
        
        db.add(db_learner)
        db.commit()
        db.refresh(db_learner)
        return db_learner
    
    @staticmethod
    def get_learner_by_id(db: Session, learner_id: str) -> Optional[Learner]:
        """Get learner by ID."""
        return db.query(Learner).filter(Learner.learnerid == learner_id).first()
    
    @staticmethod
    def get_learner_by_email(db: Session, email: str) -> Optional[Learner]:
        """Get learner by email."""
        return db.query(Learner).filter(Learner.email == email).first()
    
    @staticmethod
    def authenticate_learner(db: Session, email: str, password: str) -> Optional[Learner]:
        """Authenticate learner with email and password."""
        learner = LearnerCRUD.get_learner_by_email(db, email)
        if not learner:
            return None
        if not verify_password(password, learner.password_hash):
            return None
        return learner


class CourseCRUD:
    @staticmethod
    def get_all_courses(db: Session, skip: int = 0, limit: int = 100) -> List[Course]:
        """Get all published courses."""
        return db.query(Course).filter(Course.is_published == True).options(joinedload(Course.modules)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_course_by_id(db: Session, course_id: str) -> Optional[Course]:
        """Get course by ID with modules."""
        return db.query(Course).options(joinedload(Course.modules)).filter(Course.courseid == course_id).first()
    
    @staticmethod
    def get_course_modules(db: Session, course_id: str) -> List[Module]:
        """Get all modules for a course ordered by index."""
        return db.query(Module).filter(Module.courseid == course_id).order_by(Module.order_index).all()


class EnrollmentCRUD:
    @staticmethod
    def enroll_learner(db: Session, learner_id: str, course_id: str) -> Optional[EnrolledCourse]:
        """Enroll a learner in a course."""
        # Check if already enrolled
        existing = db.query(EnrolledCourse).filter(
            and_(EnrolledCourse.learnerid == learner_id, EnrolledCourse.courseid == course_id)
        ).first()
        
        if existing:
            return None  # Already enrolled
        
        # Create enrollment
        enrollment = EnrolledCourse(
            learnerid=learner_id,
            courseid=course_id,
            status='active'
        )
        db.add(enrollment)
        
        # Create course content progress record
        course_content = CourseContent(
            courseid=course_id,
            learnerid=learner_id,
            status='ongoing'
        )
        db.add(course_content)
        
        # Initialize module progress for all modules in the course
        modules = db.query(Module).filter(Module.courseid == course_id).all()
        for module in modules:
            module_progress = LearnerModuleProgress(
                learnerid=learner_id,
                moduleid=module.moduleid,
                status='not_started',
                progress_percentage=0
            )
            db.add(module_progress)
        
        db.commit()
        db.refresh(enrollment)
        return enrollment
    
    @staticmethod
    def get_learner_enrollments(db: Session, learner_id: str) -> List[EnrolledCourse]:
        """Get all courses a learner is enrolled in."""
        return db.query(EnrolledCourse).options(joinedload(EnrolledCourse.course)).filter(
            EnrolledCourse.learnerid == learner_id
        ).all()
    
    @staticmethod
    def unenroll_learner(db: Session, learner_id: str, course_id: str) -> bool:
        """Unenroll a learner from a course."""
        enrollment = db.query(EnrolledCourse).filter(
            and_(EnrolledCourse.learnerid == learner_id, EnrolledCourse.courseid == course_id)
        ).first()
        
        if enrollment:
            enrollment.status = 'dropped'
            db.commit()
            return True
        return False


class ProgressCRUD:
    @staticmethod
    def get_learner_course_progress(db: Session, learner_id: str, course_id: str) -> Optional[CourseContent]:
        """Get learner's progress in a specific course."""
        return db.query(CourseContent).filter(
            and_(CourseContent.learnerid == learner_id, CourseContent.courseid == course_id)
        ).first()
    
    @staticmethod
    def get_learner_module_progress(db: Session, learner_id: str, module_id: str) -> Optional[LearnerModuleProgress]:
        """Get learner's progress in a specific module."""
        return db.query(LearnerModuleProgress).filter(
            and_(LearnerModuleProgress.learnerid == learner_id, LearnerModuleProgress.moduleid == module_id)
        ).first()
    
    @staticmethod
    def update_module_progress(db: Session, learner_id: str, module_id: str, status: str, progress_percentage: int = None) -> Optional[LearnerModuleProgress]:
        """Update learner's progress in a module. Auto-creates progress record if the learner
        is enrolled in the course but the record doesn't exist (e.g. module added after enrollment)."""
        progress = db.query(LearnerModuleProgress).filter(
            and_(LearnerModuleProgress.learnerid == learner_id, LearnerModuleProgress.moduleid == module_id)
        ).first()
        
        if not progress:
            # Check if the module exists and the learner is enrolled in its course
            module = db.query(Module).filter(Module.moduleid == module_id).first()
            if not module:
                return None
            
            enrollment = db.query(EnrolledCourse).filter(
                and_(
                    EnrolledCourse.learnerid == learner_id,
                    EnrolledCourse.courseid == module.courseid,
                    EnrolledCourse.status == 'active'
                )
            ).first()
            if not enrollment:
                return None
            
            # Create the missing progress record (module was added after enrollment)
            progress = LearnerModuleProgress(
                learnerid=learner_id,
                moduleid=module_id,
                status='not_started',
                progress_percentage=0
            )
            db.add(progress)
            db.flush()
        
        progress.status = status
        if progress_percentage is not None:
            progress.progress_percentage = progress_percentage
        
        if status == 'in_progress' and not progress.started_at:
            progress.started_at = datetime.utcnow()
        elif status == 'completed':
            progress.completed_at = datetime.utcnow()
            progress.progress_percentage = 100
        
        db.commit()
        db.refresh(progress)
        
        return progress
    
    @staticmethod
    def get_all_module_progress_for_course(db: Session, learner_id: str, course_id: str) -> List[LearnerModuleProgress]:
        """Get all module progress for a learner in a specific course."""
        return db.query(LearnerModuleProgress).join(Module).filter(
            and_(LearnerModuleProgress.learnerid == learner_id, Module.courseid == course_id)
        ).all()
    
    @staticmethod
    def get_learner_dashboard_data(db: Session, learner_id: str):
        """Get comprehensive dashboard data for a learner."""
        learner = LearnerCRUD.get_learner_by_id(db, learner_id)
        enrollments = EnrollmentCRUD.get_learner_enrollments(db, learner_id)
        
        course_progress = []
        for enrollment in enrollments:
            progress = ProgressCRUD.get_learner_course_progress(db, learner_id, enrollment.courseid)
            modules_progress = ProgressCRUD.get_all_module_progress_for_course(db, learner_id, enrollment.courseid)
            
            course_progress.append({
                'courseid': enrollment.courseid,
                'learnerid': learner_id,
                'currentmodule': progress.currentmodule if progress else None,
                'status': progress.status if progress else 'not_started',
                'course': enrollment.course,
                'modules_progress': modules_progress
            })
        
        return {
            'learner': learner,
            'enrolled_courses': enrollments,
            'course_progress': course_progress
        }


class ModuleContentCRUD:
    """CRUD operations for Generated Module Content."""
    
    @staticmethod
    def get_content(db: Session, module_id: str, learner_id: str) -> Optional[GeneratedModuleContent]:
        """Get generated content for a module and learner."""
        return db.query(GeneratedModuleContent).filter(
            and_(
                GeneratedModuleContent.moduleid == module_id,
                GeneratedModuleContent.learnerid == learner_id
            )
        ).first()
    
    @staticmethod
    def save_content(db: Session, module_id: str, learner_id: str, course_id: str, content: str) -> GeneratedModuleContent:
        """Save or update generated module content."""
        existing = ModuleContentCRUD.get_content(db, module_id, learner_id)
        
        if existing:
            # Update existing content
            existing.content = content
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new content
            new_content = GeneratedModuleContent(
                moduleid=module_id,
                learnerid=learner_id,
                courseid=course_id,
                content=content
            )
            db.add(new_content)
            db.commit()
            db.refresh(new_content)
            return new_content
    
    @staticmethod
    def content_exists(db: Session, module_id: str, learner_id: str) -> bool:
        """Check if content already exists for this module and learner."""
        return db.query(GeneratedModuleContent).filter(
            and_(
                GeneratedModuleContent.moduleid == module_id,
                GeneratedModuleContent.learnerid == learner_id
            )
        ).count() > 0


class QuizCRUD:
    """CRUD operations for Generated Quizzes."""
    
    @staticmethod
    def get_quiz(db: Session, module_id: str, learner_id: str) -> Optional[GeneratedQuiz]:
        """Get generated quiz for a module and learner."""
        return db.query(GeneratedQuiz).filter(
            and_(
                GeneratedQuiz.moduleid == module_id,
                GeneratedQuiz.learnerid == learner_id
            )
        ).first()
    
    @staticmethod
    def save_quiz(db: Session, module_id: str, learner_id: str, course_id: str, quiz_data: Dict[str, Any]) -> GeneratedQuiz:
        """Save or update generated quiz."""
        existing = QuizCRUD.get_quiz(db, module_id, learner_id)
        
        if existing:
            # Update existing quiz
            existing.quiz_data = quiz_data
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new quiz
            new_quiz = GeneratedQuiz(
                moduleid=module_id,
                learnerid=learner_id,
                courseid=course_id,
                quiz_data=quiz_data
            )
            db.add(new_quiz)
            db.commit()
            db.refresh(new_quiz)
            return new_quiz
    
    @staticmethod
    def quiz_exists(db: Session, module_id: str, learner_id: str) -> bool:
        """Check if quiz already exists for this module and learner."""
        return db.query(GeneratedQuiz).filter(
            and_(
                GeneratedQuiz.moduleid == module_id,
                GeneratedQuiz.learnerid == learner_id
            )
        ).count() > 0


class ChatLogCRUD:
    """CRUD operations for Chat Logs - tracking all chat interactions."""
    
    @staticmethod
    def create_chat_log(
        db: Session,
        learner_id: str,
        courseid: str,
        user_question: str,
        ai_response: str,
        moduleid: Optional[str] = None,
        sources_count: int = 0,
        response_time_ms: Optional[int] = None,
        session_id: Optional[str] = None
    ) -> ChatLog:
        """Create a new chat log entry."""
        chat_log = ChatLog(
            learnerid=learner_id,
            courseid=courseid,
            moduleid=moduleid,
            user_question=user_question,
            ai_response=ai_response,
            sources_count=sources_count,
            response_time_ms=response_time_ms,
            session_id=session_id
        )
        db.add(chat_log)
        db.commit()
        db.refresh(chat_log)
        return chat_log
    
    @staticmethod
    def get_chat_logs(
        db: Session,
        courseid: Optional[str] = None,
        learnerid: Optional[str] = None,
        moduleid: Optional[str] = None,
        session_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[ChatLog]:
        """Get chat logs with optional filters."""
        query = db.query(ChatLog)
        
        if courseid:
            query = query.filter(ChatLog.courseid == courseid)
        if learnerid:
            query = query.filter(ChatLog.learnerid == learnerid)
        if moduleid:
            query = query.filter(ChatLog.moduleid == moduleid)
        if session_id:
            query = query.filter(ChatLog.session_id == session_id)
        if start_date:
            query = query.filter(ChatLog.created_at >= start_date)
        if end_date:
            query = query.filter(ChatLog.created_at <= end_date)
        
        return query.order_by(desc(ChatLog.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_chat_log_by_id(db: Session, log_id: int) -> Optional[ChatLog]:
        """Get a specific chat log by ID."""
        return db.query(ChatLog).filter(ChatLog.id == log_id).first()
    
    @staticmethod
    def get_chat_stats(
        db: Session,
        courseid: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get statistics about chat interactions."""
        query = db.query(ChatLog)
        
        if courseid:
            query = query.filter(ChatLog.courseid == courseid)
        if start_date:
            query = query.filter(ChatLog.created_at >= start_date)
        if end_date:
            query = query.filter(ChatLog.created_at <= end_date)
        
        total_chats = query.count()
        unique_learners = query.distinct(ChatLog.learnerid).count()
        unique_courses = query.distinct(ChatLog.courseid).count()
        
        # Calculate average response time (excluding None values)
        avg_response_time = db.query(func.avg(ChatLog.response_time_ms)).filter(
            ChatLog.response_time_ms.isnot(None)
        )
        if courseid:
            avg_response_time = avg_response_time.filter(ChatLog.courseid == courseid)
        if start_date:
            avg_response_time = avg_response_time.filter(ChatLog.created_at >= start_date)
        if end_date:
            avg_response_time = avg_response_time.filter(ChatLog.created_at <= end_date)
        
        avg_time = avg_response_time.scalar()
        
        # Get chats by course
        chats_by_course_query = query.with_entities(
            ChatLog.courseid,
            func.count(ChatLog.id).label('count')
        ).group_by(ChatLog.courseid).all()
        
        chats_by_course = {course: count for course, count in chats_by_course_query}
        
        # Get chats by date
        chats_by_date_query = query.with_entities(
            func.date(ChatLog.created_at).label('date'),
            func.count(ChatLog.id).label('count')
        ).group_by(func.date(ChatLog.created_at)).order_by(func.date(ChatLog.created_at)).all()
        
        chats_by_date = {str(date): count for date, count in chats_by_date_query}
        
        return {
            "total_chats": total_chats,
            "unique_learners": unique_learners,
            "unique_courses": unique_courses,
            "avg_response_time_ms": float(avg_time) if avg_time else None,
            "chats_by_course": chats_by_course,
            "chats_by_date": chats_by_date
        }
    
    @staticmethod
    def update_feedback(db: Session, log_id: int, feedback: str) -> Optional[ChatLog]:
        """Update feedback for a chat log entry."""
        chat_log = ChatLogCRUD.get_chat_log_by_id(db, log_id)
        if chat_log:
            chat_log.feedback = feedback
            db.commit()
            db.refresh(chat_log)
            return chat_log
        return None
    
    @staticmethod
    def delete_chat_log(db: Session, log_id: int) -> bool:
        """Delete a chat log entry."""
        chat_log = ChatLogCRUD.get_chat_log_by_id(db, log_id)
        if chat_log:
            db.delete(chat_log)
            db.commit()
            return True
        return False


class ModuleFeedbackCRUD:
    """CRUD operations for Module Feedback - collecting learner feedback after module completion."""
    
    @staticmethod
    def create_feedback(
        db: Session,
        learner_id: str,
        courseid: str,
        moduleid: str,
        rating: int,
        module_title: Optional[str] = None,
        feedback_text: Optional[str] = None
    ) -> ModuleFeedback:
        """Create or update module feedback (upsert based on learner+module uniqueness)."""
        # Check if feedback already exists
        existing = db.query(ModuleFeedback).filter(
            and_(
                ModuleFeedback.learnerid == learner_id,
                ModuleFeedback.moduleid == moduleid
            )
        ).first()
        
        if existing:
            # Update existing feedback
            existing.rating = rating
            existing.feedback_text = feedback_text
            if module_title:
                existing.module_title = module_title
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new feedback
            feedback = ModuleFeedback(
                learnerid=learner_id,
                courseid=courseid,
                moduleid=moduleid,
                module_title=module_title,
                rating=rating,
                feedback_text=feedback_text
            )
            db.add(feedback)
            db.commit()
            db.refresh(feedback)
            return feedback
    
    @staticmethod
    def get_module_feedback(db: Session, learner_id: str, moduleid: str) -> Optional[ModuleFeedback]:
        """Get feedback for a specific module by a specific learner."""
        return db.query(ModuleFeedback).filter(
            and_(
                ModuleFeedback.learnerid == learner_id,
                ModuleFeedback.moduleid == moduleid
            )
        ).first()
    
    @staticmethod
    def get_course_feedbacks(db: Session, courseid: str, skip: int = 0, limit: int = 100) -> List[ModuleFeedback]:
        """Get all module feedbacks for a course."""
        return db.query(ModuleFeedback).filter(
            ModuleFeedback.courseid == courseid
        ).order_by(desc(ModuleFeedback.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_module_feedbacks_all_learners(db: Session, moduleid: str, skip: int = 0, limit: int = 100) -> List[ModuleFeedback]:
        """Get all feedbacks for a specific module across all learners."""
        return db.query(ModuleFeedback).filter(
            ModuleFeedback.moduleid == moduleid
        ).order_by(desc(ModuleFeedback.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_feedback_stats(db: Session, courseid: Optional[str] = None, moduleid: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics about module feedback."""
        query = db.query(ModuleFeedback)
        
        if courseid:
            query = query.filter(ModuleFeedback.courseid == courseid)
        if moduleid:
            query = query.filter(ModuleFeedback.moduleid == moduleid)
        
        total_feedbacks = query.count()
        avg_rating = query.with_entities(func.avg(ModuleFeedback.rating)).scalar()
        
        # Get rating distribution
        rating_dist_query = query.with_entities(
            ModuleFeedback.rating,
            func.count(ModuleFeedback.id).label('count')
        ).group_by(ModuleFeedback.rating).all()
        
        rating_distribution = {rating: count for rating, count in rating_dist_query}
        
        return {
            "total_feedbacks": total_feedbacks,
            "average_rating": float(avg_rating) if avg_rating else None,
            "rating_distribution": rating_distribution
        }


class QuizFeedbackCRUD:
    """CRUD operations for Quiz Feedback - collecting learner feedback after quiz completion."""
    
    @staticmethod
    def create_feedback(
        db: Session,
        learner_id: str,
        courseid: str,
        moduleid: str,
        rating: int,
        quiz_id: Optional[int] = None,
        module_title: Optional[str] = None,
        quiz_score: Optional[int] = None,
        feedback_text: Optional[str] = None
    ) -> QuizFeedback:
        """Create or update quiz feedback (upsert based on learner+module uniqueness)."""
        # Check if feedback already exists
        existing = db.query(QuizFeedback).filter(
            and_(
                QuizFeedback.learnerid == learner_id,
                QuizFeedback.moduleid == moduleid
            )
        ).first()
        
        if existing:
            # Update existing feedback
            existing.rating = rating
            existing.feedback_text = feedback_text
            existing.quiz_score = quiz_score
            if module_title:
                existing.module_title = module_title
            if quiz_id:
                existing.quiz_id = quiz_id
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new feedback
            feedback = QuizFeedback(
                learnerid=learner_id,
                courseid=courseid,
                moduleid=moduleid,
                quiz_id=quiz_id,
                module_title=module_title,
                quiz_score=quiz_score,
                rating=rating,
                feedback_text=feedback_text
            )
            db.add(feedback)
            db.commit()
            db.refresh(feedback)
            return feedback
    
    @staticmethod
    def get_quiz_feedback(db: Session, learner_id: str, moduleid: str) -> Optional[QuizFeedback]:
        """Get feedback for a specific quiz by a specific learner."""
        return db.query(QuizFeedback).filter(
            and_(
                QuizFeedback.learnerid == learner_id,
                QuizFeedback.moduleid == moduleid
            )
        ).first()
    
    @staticmethod
    def get_course_feedbacks(db: Session, courseid: str, skip: int = 0, limit: int = 100) -> List[QuizFeedback]:
        """Get all quiz feedbacks for a course."""
        return db.query(QuizFeedback).filter(
            QuizFeedback.courseid == courseid
        ).order_by(desc(QuizFeedback.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_feedback_stats(db: Session, courseid: Optional[str] = None, moduleid: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics about quiz feedback."""
        query = db.query(QuizFeedback)
        
        if courseid:
            query = query.filter(QuizFeedback.courseid == courseid)
        if moduleid:
            query = query.filter(QuizFeedback.moduleid == moduleid)
        
        total_feedbacks = query.count()
        avg_rating = query.with_entities(func.avg(QuizFeedback.rating)).scalar()
        avg_score = query.with_entities(func.avg(QuizFeedback.quiz_score)).filter(
            QuizFeedback.quiz_score.isnot(None)
        ).scalar()
        
        # Get rating distribution
        rating_dist_query = query.with_entities(
            QuizFeedback.rating,
            func.count(QuizFeedback.id).label('count')
        ).group_by(QuizFeedback.rating).all()
        
        rating_distribution = {rating: count for rating, count in rating_dist_query}
        
        return {
            "total_feedbacks": total_feedbacks,
            "average_rating": float(avg_rating) if avg_rating else None,
            "average_quiz_score": float(avg_score) if avg_score else None,
            "rating_distribution": rating_distribution
        }
