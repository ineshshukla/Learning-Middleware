from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from models import (
    Learner, Course, Module, EnrolledCourse, 
    CourseContent, LearnerModuleProgress, GeneratedModuleContent, GeneratedQuiz
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
        """Update learner's progress in a module."""
        progress = db.query(LearnerModuleProgress).filter(
            and_(LearnerModuleProgress.learnerid == learner_id, LearnerModuleProgress.moduleid == module_id)
        ).first()
        
        if progress:
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