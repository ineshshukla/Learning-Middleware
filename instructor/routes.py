from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import schemas
import crud
import models
from database import get_db, get_mongo_db
from auth import create_access_token, verify_token
from config import settings

router = APIRouter()
security = HTTPBearer()


# Dependency to get current instructor
def get_current_instructor(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> models.Instructor:
    """Get current authenticated instructor."""
    token = credentials.credentials
    instructorid = verify_token(token)
    
    if instructorid is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    instructor = crud.InstructorCRUD.get_by_id(db, instructorid)
    if instructor is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Instructor not found"
        )
    
    return instructor


@router.post("/signup", response_model=schemas.InstructorResponse, status_code=status.HTTP_201_CREATED)
def signup(
    instructor_data: schemas.InstructorCreate,
    db: Session = Depends(get_db)
):
    """Register a new instructor."""
    # Check if email already exists
    existing_email = crud.InstructorCRUD.get_by_email(db, instructor_data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new instructor (ID will be auto-generated)
    new_instructor = crud.InstructorCRUD.create(db, instructor_data)
    return new_instructor


@router.post("/login", response_model=schemas.Token)
def login(
    login_data: schemas.InstructorLogin,
    db: Session = Depends(get_db)
):
    """Login instructor and return JWT token."""
    instructor = crud.InstructorCRUD.authenticate(
        db,
        login_data.email,
        login_data.password
    )
    
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": instructor.instructorid})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.InstructorResponse)
def get_current_instructor_info(
    current_instructor: models.Instructor = Depends(get_current_instructor)
):
    """Get current instructor information."""
    return current_instructor


@router.get("/health/mongodb")
def check_mongodb_connection(mongo_db = Depends(get_mongo_db)):
    """Check if MongoDB connection is working."""
    try:
        # Try to list collections
        collections = mongo_db.list_collection_names()
        return {
            "status": "connected",
            "database": mongo_db.name,
            "collections": collections
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MongoDB connection failed: {str(e)}"
        )


@router.post("/courses", response_model=schemas.CourseWithModules, status_code=status.HTTP_201_CREATED)
def create_course(
    course_data: schemas.CourseCreate,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """Create a new course with modules."""
    # Debug logging
    print(f"Received course data: {course_data}")
    print(f"Number of modules received: {len(course_data.modules) if course_data.modules else 0}")
    if course_data.modules:
        for idx, mod in enumerate(course_data.modules):
            print(f"Module {idx}: title='{mod.title}', description='{mod.description}'")
    
    # Create course (ID will be auto-generated)
    new_course = crud.CourseCRUD.create(db, course_data, current_instructor.instructorid)
    print(f"Created course with ID: {new_course.courseid}")
    
    # Create modules if provided
    created_modules = []
    if course_data.modules:
        print(f"Creating {len(course_data.modules)} modules...")
        for idx, module_input in enumerate(course_data.modules):
            module_id = f"{new_course.courseid}_MOD_{idx + 1}"
            print(f"Creating module {idx + 1} with ID: {module_id}")
            print(f"  Title: '{module_input.title}'")
            print(f"  Description: '{module_input.description}'")
            
            try:
                module_create = schemas.ModuleCreate(
                    moduleid=module_id,
                    courseid=new_course.courseid,
                    title=module_input.title,
                    description=module_input.description,
                    order_index=idx
                )
                new_module = crud.ModuleCRUD.create(db, module_create)
                created_modules.append(new_module)
                print(f"✓ Successfully created module: {new_module.moduleid} - {new_module.title}")
                
                # Initialize learning objectives for each module in MongoDB
                try:
                    crud.LearningObjectivesCRUD.create_objectives(mongo_db, module_id)
                    print(f"✓ Initialized learning objectives for module: {module_id}")
                except Exception as e:
                    print(f"⚠ Warning: Failed to initialize learning objectives for {module_id}: {e}")
                    # Don't fail the whole operation if MongoDB initialization fails
                    
            except Exception as e:
                print(f"✗ Error creating module {idx + 1}: {e}")
                # Rollback and raise
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create module '{module_input.title}': {str(e)}"
                )
    
    print(f"Total modules created: {len(created_modules)}")
    
    return {
        "courseid": new_course.courseid,
        "instructorid": new_course.instructorid,
        "course_name": new_course.course_name,
        "coursedescription": new_course.coursedescription,
        "targetaudience": new_course.targetaudience,
        "prereqs": new_course.prereqs,
        "created_at": new_course.created_at,
        "updated_at": new_course.updated_at,
        "modules": created_modules
    }


@router.get("/courses", response_model=List[schemas.CourseWithModules])
def get_my_courses(
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db)
):
    """Get all courses created by current instructor."""
    courses = crud.CourseCRUD.get_all_by_instructor(db, current_instructor.instructorid)
    
    # Fetch modules for each course
    result = []
    for course in courses:
        modules = crud.ModuleCRUD.get_by_course(db, course.courseid)
        course_dict = {
            "courseid": course.courseid,
            "instructorid": course.instructorid,
            "course_name": course.course_name,
            "coursedescription": course.coursedescription,
            "targetaudience": course.targetaudience,
            "prereqs": course.prereqs,
            "created_at": course.created_at,
            "updated_at": course.updated_at,
            "modules": modules
        }
        result.append(course_dict)
    
    return result


@router.get("/courses/{courseid}", response_model=schemas.CourseWithModules)
def get_course(
    courseid: str,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db)
):
    """Get a specific course with modules."""
    course = crud.CourseCRUD.get_by_id(db, courseid)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if instructor owns this course
    if course.instructorid != current_instructor.instructorid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this course"
        )
    
    # Fetch modules
    modules = crud.ModuleCRUD.get_by_course(db, courseid)
    
    return {
        "courseid": course.courseid,
        "instructorid": course.instructorid,
        "course_name": course.course_name,
        "coursedescription": course.coursedescription,
        "targetaudience": course.targetaudience,
        "prereqs": course.prereqs,
        "created_at": course.created_at,
        "updated_at": course.updated_at,
        "modules": modules
    }


@router.get("/modules/{moduleid}/objectives", response_model=schemas.LearningObjectivesResponse)
def get_learning_objectives(
    moduleid: str,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """Get learning objectives for a module."""
    # Check if module exists
    module = crud.ModuleCRUD.get_by_id(db, moduleid)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    # Check if instructor owns the course
    course = crud.CourseCRUD.get_by_id(db, module.courseid)
    if course.instructorid != current_instructor.instructorid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this module"
        )
    
    # Get objectives from MongoDB
    objectives_doc = crud.LearningObjectivesCRUD.get_objectives(mongo_db, moduleid)
    
    if not objectives_doc:
        # Create empty objectives if not exists
        objectives_doc = crud.LearningObjectivesCRUD.create_objectives(mongo_db, moduleid)
    
    return {
        "module_id": moduleid,
        "objectives": objectives_doc.get("objectives", [])
    }


@router.post("/modules/{moduleid}/objectives", response_model=schemas.LearningObjectivesResponse)
def add_learning_objective(
    moduleid: str,
    objective_data: schemas.AddLearningObjective,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """Add a learning objective to a module."""
    # Check if module exists
    module = crud.ModuleCRUD.get_by_id(db, moduleid)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    # Check if instructor owns the course
    course = crud.CourseCRUD.get_by_id(db, module.courseid)
    if course.instructorid != current_instructor.instructorid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this module"
        )
    
    # Add objective
    updated_doc = crud.LearningObjectivesCRUD.add_objective(
        mongo_db,
        moduleid,
        objective_data.text
    )
    
    return {
        "module_id": moduleid,
        "objectives": updated_doc.get("objectives", [])
    }


@router.put("/modules/{moduleid}/objectives", response_model=schemas.LearningObjectivesResponse)
def update_learning_objective(
    moduleid: str,
    objective_data: schemas.UpdateLearningObjective,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """Update a learning objective."""
    # Check if module exists
    module = crud.ModuleCRUD.get_by_id(db, moduleid)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    # Check if instructor owns the course
    course = crud.CourseCRUD.get_by_id(db, module.courseid)
    if course.instructorid != current_instructor.instructorid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this module"
        )
    
    # Update objective
    updated_doc = crud.LearningObjectivesCRUD.update_objective(
        mongo_db,
        moduleid,
        objective_data.objective_id,
        objective_data.text
    )
    
    if not updated_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objective not found"
        )
    
    return {
        "module_id": moduleid,
        "objectives": updated_doc.get("objectives", [])
    }


@router.delete("/modules/{moduleid}/objectives/{objective_id}", response_model=schemas.LearningObjectivesResponse)
def delete_learning_objective(
    moduleid: str,
    objective_id: str,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """Delete a learning objective."""
    # Check if module exists
    module = crud.ModuleCRUD.get_by_id(db, moduleid)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    # Check if instructor owns the course
    course = crud.CourseCRUD.get_by_id(db, module.courseid)
    if course.instructorid != current_instructor.instructorid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this module"
        )
    
    # Remove objective
    updated_doc = crud.LearningObjectivesCRUD.remove_objective(
        mongo_db,
        moduleid,
        objective_id
    )
    
    if not updated_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objective not found"
        )
    
    return {
        "module_id": moduleid,
        "objectives": updated_doc.get("objectives", [])
    }


@router.post("/courses/{courseid}/upload", response_model=schemas.FileMetadata)
async def upload_course_file(
    courseid: str,
    file: UploadFile = File(...),
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """Upload a file to a course. This will intelligently update module content and learning objectives."""
    # Check if course exists and instructor owns it
    course = crud.CourseCRUD.get_by_id(db, courseid)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    if course.instructorid != current_instructor.instructorid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload files to this course"
        )
    
    # Upload file
    file_metadata = crud.FileCRUD.upload_file(
        mongo_db,
        courseid,
        file,
        settings.upload_dir
    )
    
    # Get existing modules for this course
    modules = crud.ModuleCRUD.get_by_course(db, courseid)
    
    # Intelligently assign file to appropriate module based on filename/type
    # This is a simplified version - in production, you'd use AI/NLP to analyze content
    file_extension = file.filename.split('.')[-1].lower()
    
    # Update module content_path based on file type
    if modules:
        # Assign to Core Concepts module (index 1) by default for content files
        target_module = None
        if file_extension in ['pdf', 'doc', 'docx', 'ppt', 'pptx']:
            # Main content goes to Core Concepts
            target_module = next((m for m in modules if m.order_index == 1), modules[0])
        elif file_extension in ['mp4', 'avi', 'mov', 'mkv']:
            # Video content
            target_module = next((m for m in modules if m.order_index == 1), modules[0])
        elif file_extension in ['zip', 'rar', 'tar', 'gz']:
            # Additional resources
            target_module = next((m for m in modules if m.order_index == 2), modules[0])
        else:
            target_module = modules[0]
        
        if target_module:
            # Update module content path
            db.query(models.Module).filter(
                models.Module.moduleid == target_module.moduleid
            ).update({"content_path": file_metadata['file_path']})
            db.commit()
            
            # Add intelligent learning objective based on file
            objective_text = f"Study and understand content from {file.filename}"
            crud.LearningObjectivesCRUD.add_objective(
                mongo_db,
                target_module.moduleid,
                objective_text
            )
    
    return file_metadata


@router.get("/courses/{courseid}/files", response_model=List[schemas.FileMetadata])
def get_course_files(
    courseid: str,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """Get all files for a course."""
    # Check if course exists and instructor owns it
    course = crud.CourseCRUD.get_by_id(db, courseid)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    if course.instructorid != current_instructor.instructorid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this course"
        )
    
    # Get files
    files = crud.FileCRUD.get_files(mongo_db, courseid)
    return files