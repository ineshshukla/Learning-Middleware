from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

from database import get_db
from schemas import (
    LearnerCreate, LearnerResponse, LearnerLogin, Token,
    CourseResponse, CourseEnrollRequest, EnrollmentResponse,
    ModuleProgressResponse, CourseProgressResponse, LearnerDashboardResponse,
    ModuleProgressBase, ModuleContentCreate, ModuleContentResponse, ModuleContentCheck,
    QuizDataCreate, QuizDataResponse, QuizDataCheck
)
from crud import LearnerCRUD, CourseCRUD, EnrollmentCRUD, ProgressCRUD, ModuleContentCRUD, QuizCRUD
from auth import create_access_token, verify_token
from config import settings

router = APIRouter()
security = HTTPBearer()


def get_current_learner(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current authenticated learner."""
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(token, credentials_exception)
    learner = LearnerCRUD.get_learner_by_id(db, learner_id=token_data.learner_id)
    if learner is None:
        raise credentials_exception
    return learner


@router.post("/signup", response_model=LearnerResponse, status_code=status.HTTP_201_CREATED)
def signup(learner: LearnerCreate, db: Session = Depends(get_db)):
    """Register a new learner."""
    # Check if learner already exists
    existing_learner = LearnerCRUD.get_learner_by_email(db, email=learner.email)
    if existing_learner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new learner
    db_learner = LearnerCRUD.create_learner(db=db, learner=learner)
    return db_learner


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login learner and return access token."""
    learner = LearnerCRUD.authenticate_learner(db, email=form_data.username, password=form_data.password)
    if not learner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": learner.learnerid}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login-json", response_model=Token)
def login_json(learner_login: LearnerLogin, db: Session = Depends(get_db)):
    """Login learner with JSON payload and return access token."""
    learner = LearnerCRUD.authenticate_learner(db, email=learner_login.email, password=learner_login.password)
    if not learner:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": learner.learnerid}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=LearnerResponse)
def get_current_learner_info(current_learner = Depends(get_current_learner)):
    """Get current learner information."""
    return current_learner


# Course Management Routes
@router.get("/courses", response_model=List[CourseResponse])
def get_all_courses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all available courses."""
    courses = CourseCRUD.get_all_courses(db, skip=skip, limit=limit)
    return courses


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(course_id: str, db: Session = Depends(get_db)):
    """Get course details by ID."""
    course = CourseCRUD.get_course_by_id(db, course_id=course_id)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    return course


# Enrollment Routes
@router.post("/enroll", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def enroll_in_course(
    enrollment_request: CourseEnrollRequest,
    current_learner = Depends(get_current_learner),
    db: Session = Depends(get_db)
):
    """Enroll the current learner in a course."""
    # Check if course exists
    course = CourseCRUD.get_course_by_id(db, course_id=enrollment_request.courseid)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Enroll learner
    enrollment = EnrollmentCRUD.enroll_learner(
        db, learner_id=current_learner.learnerid, course_id=enrollment_request.courseid
    )
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already enrolled in this course"
        )
    
    return enrollment


@router.get("/my-courses", response_model=List[EnrollmentResponse])
def get_my_courses(current_learner = Depends(get_current_learner), db: Session = Depends(get_db)):
    """Get all courses the current learner is enrolled in."""
    enrollments = EnrollmentCRUD.get_learner_enrollments(db, learner_id=current_learner.learnerid)
    return enrollments


@router.delete("/unenroll/{course_id}")
def unenroll_from_course(
    course_id: str,
    current_learner = Depends(get_current_learner),
    db: Session = Depends(get_db)
):
    """Unenroll the current learner from a course."""
    success = EnrollmentCRUD.unenroll_learner(
        db, learner_id=current_learner.learnerid, course_id=course_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )
    
    return {"message": "Successfully unenrolled from course"}


# Progress Tracking Routes
@router.get("/progress/{course_id}", response_model=CourseProgressResponse)
def get_course_progress(
    course_id: str,
    current_learner = Depends(get_current_learner),
    db: Session = Depends(get_db)
):
    """Get learner's progress in a specific course."""
    course_progress = ProgressCRUD.get_learner_course_progress(
        db, learner_id=current_learner.learnerid, course_id=course_id
    )
    
    if not course_progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course progress not found. Make sure you're enrolled in this course."
        )
    
    # Get course details and modules progress
    course = CourseCRUD.get_course_by_id(db, course_id=course_id)
    modules_progress = ProgressCRUD.get_all_module_progress_for_course(
        db, learner_id=current_learner.learnerid, course_id=course_id
    )
    
    return {
        'courseid': course_id,
        'learnerid': current_learner.learnerid,
        'currentmodule': course_progress.currentmodule,
        'status': course_progress.status,
        'course': course,
        'modules_progress': modules_progress
    }


@router.put("/progress/module/{module_id}", response_model=ModuleProgressResponse)
def update_module_progress(
    module_id: str,
    progress_update: ModuleProgressBase,
    current_learner = Depends(get_current_learner),
    db: Session = Depends(get_db)
):
    """Update learner's progress in a specific module."""
    updated_progress = ProgressCRUD.update_module_progress(
        db,
        learner_id=current_learner.learnerid,
        module_id=module_id,
        status=progress_update.status,
        progress_percentage=progress_update.progress_percentage
    )
    
    if not updated_progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module progress not found. Make sure you're enrolled in this course."
        )
    
    return updated_progress


@router.get("/dashboard", response_model=LearnerDashboardResponse)
def get_learner_dashboard(
    current_learner = Depends(get_current_learner),
    db: Session = Depends(get_db)
):
    """Get comprehensive dashboard data for the current learner."""
    dashboard_data = ProgressCRUD.get_learner_dashboard_data(
        db, learner_id=current_learner.learnerid
    )
    
    return dashboard_data


# Module Content Routes
@router.get("/module/{module_id}/content", response_model=ModuleContentCheck)
def check_module_content(
    module_id: str,
    current_learner = Depends(get_current_learner),
    db: Session = Depends(get_db)
):
    """Check if generated content exists for a module and return it if it does."""
    print(f"[DEBUG] Checking content for module_id={module_id}, learner_id={current_learner.learnerid}")
    content = ModuleContentCRUD.get_content(db, module_id, current_learner.learnerid)
    
    if content:
        print(f"[DEBUG] Content found! Length: {len(content.content)} chars")
        return {
            "exists": True,
            "content": content.content
        }
    else:
        print(f"[DEBUG] No content found for this learner+module combination")
        return {
            "exists": False,
            "content": None
        }


@router.post("/module/{module_id}/content", response_model=ModuleContentResponse, status_code=status.HTTP_201_CREATED)
def save_module_content(
    module_id: str,
    content_data: ModuleContentCreate,
    current_learner = Depends(get_current_learner),
    db: Session = Depends(get_db)
):
    """Save generated module content for the current learner."""
    # Verify the module exists and belongs to the course
    from models import Module
    module = db.query(Module).filter(Module.moduleid == module_id).first()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module {module_id} not found"
        )
    
    if module.courseid != content_data.course_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Module does not belong to the specified course"
        )
    
    # Save the content
    saved_content = ModuleContentCRUD.save_content(
        db=db,
        module_id=module_id,
        learner_id=current_learner.learnerid,
        course_id=content_data.course_id,
        content=content_data.content
    )
    
    return saved_content


# Quiz Caching Routes
@router.get("/module/{module_id}/quiz", response_model=QuizDataCheck)
def check_module_quiz(
    module_id: str,
    current_learner = Depends(get_current_learner),
    db: Session = Depends(get_db)
):
    """Check if generated quiz exists for a module and return it if it does."""
    print(f"[DEBUG] Checking quiz for module_id={module_id}, learner_id={current_learner.learnerid}")
    quiz = QuizCRUD.get_quiz(db, module_id, current_learner.learnerid)
    
    if quiz:
        print(f"[DEBUG] Quiz found! Questions: {len(quiz.quiz_data.get('questions', []))}")
        return {
            "exists": True,
            "quiz_data": quiz.quiz_data
        }
    else:
        print(f"[DEBUG] No quiz found for this learner+module combination")
        return {
            "exists": False,
            "quiz_data": None
        }


@router.post("/module/{module_id}/quiz", response_model=QuizDataResponse, status_code=status.HTTP_201_CREATED)
def save_module_quiz(
    module_id: str,
    quiz_create: QuizDataCreate,
    current_learner = Depends(get_current_learner),
    db: Session = Depends(get_db)
):
    """Save generated quiz for the current learner."""
    # Verify the module exists and belongs to the course
    from models import Module
    module = db.query(Module).filter(Module.moduleid == module_id).first()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Module {module_id} not found"
        )
    
    if module.courseid != quiz_create.course_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Module does not belong to the specified course"
        )
    
    # Save the quiz
    saved_quiz = QuizCRUD.save_quiz(
        db=db,
        module_id=module_id,
        learner_id=current_learner.learnerid,
        course_id=quiz_create.course_id,
        quiz_data=quiz_create.quiz_data
    )
    
    return saved_quiz


# Admin/Testing Routes (for development/testing purposes)
@router.post("/admin/init-sample-data")
def initialize_sample_data(db: Session = Depends(get_db)):
    """Initialize sample courses and modules for testing (admin only in production)."""
    from models import Instructor, Course, Module
    import uuid
    
    # Create sample instructor if not exists
    instructor = db.query(Instructor).filter(Instructor.instructorid == "inst_001").first()
    if not instructor:
        instructor = Instructor(
            instructorid="inst_001",
            email="instructor@example.com", 
            password_hash="dummy_hash",
            first_name="John",
            last_name="Professor"
        )
        db.add(instructor)
    
    # Create sample courses if not exist
    courses_data = [
        {
            "courseid": "CSE101",
            "course_name": "Introduction to Computer Science",
            "coursedescription": "Basic concepts of programming and computer science",
            "targetaudience": "Beginners",
            "prereqs": "None"
        },
        {
            "courseid": "CSE102", 
            "course_name": "Data Structures and Algorithms",
            "coursedescription": "Advanced data structures and algorithmic thinking",
            "targetaudience": "Intermediate",
            "prereqs": "CSE101"
        },
        {
            "courseid": "WEB101",
            "course_name": "Web Development Fundamentals", 
            "coursedescription": "HTML, CSS, JavaScript basics",
            "targetaudience": "Beginners",
            "prereqs": "None"
        }
    ]
    
    for course_data in courses_data:
        existing_course = db.query(Course).filter(Course.courseid == course_data["courseid"]).first()
        if not existing_course:
            course = Course(
                instructorid="inst_001",
                **course_data
            )
            db.add(course)
    
    # Create sample modules
    modules_data = [
        {"moduleid": "CSE101_M1", "courseid": "CSE101", "title": "Introduction to Programming", "description": "Basic programming concepts", "order_index": 1},
        {"moduleid": "CSE101_M2", "courseid": "CSE101", "title": "Variables and Data Types", "description": "Understanding data types", "order_index": 2},
        {"moduleid": "CSE101_M3", "courseid": "CSE101", "title": "Control Structures", "description": "If statements and loops", "order_index": 3},
        {"moduleid": "CSE102_M1", "courseid": "CSE102", "title": "Arrays and Lists", "description": "Linear data structures", "order_index": 1},
        {"moduleid": "CSE102_M2", "courseid": "CSE102", "title": "Stacks and Queues", "description": "LIFO and FIFO structures", "order_index": 2},
        {"moduleid": "WEB101_M1", "courseid": "WEB101", "title": "HTML Basics", "description": "Markup language fundamentals", "order_index": 1},
        {"moduleid": "WEB101_M2", "courseid": "WEB101", "title": "CSS Styling", "description": "Styling and layout", "order_index": 2},
    ]
    
    for module_data in modules_data:
        existing_module = db.query(Module).filter(Module.moduleid == module_data["moduleid"]).first()
        if not existing_module:
            module = Module(**module_data)
            db.add(module)
    
    db.commit()
    return {"message": "Sample data initialized successfully!"}