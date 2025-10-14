from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
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
            "is_published": course.is_published,
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
        "is_published": course.is_published,
        "created_at": course.created_at,
        "updated_at": course.updated_at,
        "modules": modules
    }


@router.put("/courses/{courseid}/publish")
def publish_course(
    courseid: str,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db)
):
    """Publish a course to make it visible to learners."""
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
            detail="Not authorized to publish this course"
        )
    
    # Update is_published to True
    course.is_published = True
    db.commit()
    db.refresh(course)
    
    return {
        "message": "Course published successfully",
        "courseid": courseid,
        "is_published": True
    }


@router.put("/courses/{courseid}/unpublish")
def unpublish_course(
    courseid: str,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db)
):
    """Unpublish a course to hide it from learners."""
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
            detail="Not authorized to unpublish this course"
        )
    
    # Update is_published to False
    course.is_published = False
    db.commit()
    db.refresh(course)
    
    return {
        "message": "Course unpublished successfully",
        "courseid": courseid,
        "is_published": False
    }


@router.delete("/courses/{courseid}")
def delete_course(
    courseid: str,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """
    Delete a course and all associated data.
    This includes:
    - Course record in PostgreSQL
    - All modules (cascade delete)
    - Learning objectives in MongoDB
    - Vector store data in MongoDB
    """
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
            detail="Not authorized to delete this course"
        )
    
    # Get all module IDs before deletion
    modules = crud.ModuleCRUD.get_by_course(db, courseid)
    module_ids = [m.moduleid for m in modules]
    
    # Delete learning objectives from MongoDB for each module
    for module_id in module_ids:
        try:
            mongo_db["learning_objectives"].delete_one({"module_id": module_id})
        except Exception as e:
            print(f"Warning: Failed to delete LOs for module {module_id}: {e}")
    
    # Delete vector store data from MongoDB
    try:
        mongo_db["course_vector_stores"].delete_one({"course_id": courseid})
    except Exception as e:
        print(f"Warning: Failed to delete vector store for course {courseid}: {e}")
    
    # Delete course from PostgreSQL (modules cascade delete automatically)
    crud.CourseCRUD.delete(db, courseid)
    
    return {
        "message": "Course deleted successfully",
        "courseid": courseid
    }


# Module Management Endpoints
@router.post("/courses/{courseid}/modules", response_model=schemas.ModuleResponse, status_code=status.HTTP_201_CREATED)
def add_module_to_course(
    courseid: str,
    module_data: schemas.ModuleInput,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db)
):
    """Add a new module to a course."""
    # Check if course exists and belongs to instructor
    course = crud.CourseCRUD.get_by_id(db, courseid)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    if course.instructorid != current_instructor.instructorid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this course"
        )
    
    # Get current modules count for order_index
    existing_modules = crud.ModuleCRUD.get_by_course(db, courseid)
    order_index = len(existing_modules)
    
    # Generate module ID
    module_id = f"{courseid}_MOD_{order_index + 1}"
    
    # Create module
    module_create = schemas.ModuleCreate(
        moduleid=module_id,
        courseid=courseid,
        title=module_data.title,
        description=module_data.description,
        order_index=order_index
    )
    
    new_module = crud.ModuleCRUD.create(db, module_create)
    return new_module


@router.put("/modules/{moduleid}", response_model=schemas.ModuleResponse)
def update_module(
    moduleid: str,
    module_data: schemas.ModuleUpdate,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db)
):
    """Update a module."""
    # Check if module exists
    module = crud.ModuleCRUD.get_by_id(db, moduleid)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    # Check if course belongs to instructor
    course = crud.CourseCRUD.get_by_id(db, module.courseid)
    if not course or course.instructorid != current_instructor.instructorid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this module"
        )
    
    updated_module = crud.ModuleCRUD.update(db, moduleid, module_data)
    if not updated_module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    return updated_module


@router.delete("/modules/{moduleid}")
def delete_module(
    moduleid: str,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """Delete a module."""
    # Check if module exists
    module = crud.ModuleCRUD.get_by_id(db, moduleid)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    # Check if course belongs to instructor
    course = crud.CourseCRUD.get_by_id(db, module.courseid)
    if not course or course.instructorid != current_instructor.instructorid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this module"
        )
    
    # Delete learning objectives for this module from MongoDB
    try:
        mongo_db["learning_objectives"].delete_one({"module_id": moduleid})
    except Exception as e:
        print(f"Warning: Failed to delete learning objectives for module {moduleid}: {e}")
    
    # Delete module from PostgreSQL
    success = crud.ModuleCRUD.delete(db, moduleid)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    return {
        "message": "Module deleted successfully",
        "moduleid": moduleid
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


# ============================================================================
# SME Service Integration Routes
# ============================================================================

@router.post("/courses/{courseid}/upload-to-sme", response_model=schemas.FileUploadToSMEResponse)
async def upload_course_files_to_sme(
    courseid: str,
    files: List[UploadFile] = File(...),
    create_vector_store: bool = True,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """
    Upload course reference files to instructor storage and then to SME service.
    Files are saved locally first, then sent to SME for processing.
    
    Args:
        courseid: Course ID
        files: Files to upload
        create_vector_store: Whether to trigger vector store creation after upload.
                           Set to False when uploading multiple batches of files.
                           Default: True (auto-create after upload)
    
    Note: If vector store is already being created, new creation will be skipped.
          Upload files in batches with create_vector_store=False, then call
          /create-vector-store endpoint manually when all files are uploaded.
    """
    from sme_client import sme_client
    import uuid
    from datetime import datetime
    import os
    import asyncio
    import logging
    import shutil
    
    logger = logging.getLogger(__name__)
    
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
    
    # Create local directory for course files
    course_dir = f"/app/uploads/courses/{courseid}"
    os.makedirs(course_dir, exist_ok=True)
    
    # Save files locally first and collect metadata
    mongo_file_ids = []
    uploaded_files_metadata = []
    saved_file_paths = []
    
    for file in files:
        file_id = str(uuid.uuid4())
        file_path = os.path.join(course_dir, file.filename)
        
        # Save file to local storage
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"Saved file locally: {file_path}")
        except Exception as e:
            logger.error(f"Failed to save file {file.filename}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file {file.filename}: {str(e)}"
            )
        
        # Reset file pointer for SME upload
        file.file.seek(0)
        saved_file_paths.append(file_path)
        
        file_metadata = {
            "file_id": file_id,
            "course_id": courseid,
            "instructor_id": current_instructor.instructorid,
            "filename": file.filename,
            "file_path": file_path,
            "file_type": file.content_type,
            "file_size": file.size,
            "uploaded_at": datetime.utcnow(),
            "sme_uploaded": False  # Will be set to True after SME upload
        }
        
        # Insert into MongoDB
        result = mongo_db["course_files"].insert_one(file_metadata)
        mongo_file_ids.append(file_id)
        uploaded_files_metadata.append({
            "file_id": file_id,
            "filename": file.filename,
            "file_size": file.size,
            "file_type": file.content_type,
            "local_path": file_path
        })
    
    # Now upload files to SME service
    try:
        sme_response = sme_client.upload_files(courseid, files)
        
        # Update MongoDB to mark files as uploaded to SME
        for file_id in mongo_file_ids:
            mongo_db["course_files"].update_one(
                {"file_id": file_id},
                {"$set": {"sme_uploaded": True}}
            )
        logger.info(f"Successfully uploaded {len(files)} files to SME for course {courseid}")
    except Exception as e:
        logger.error(f"Failed to upload files to SME: {e}")
        # Files are still saved locally, so we can retry later
        sme_response = {"error": str(e), "message": "Files saved locally but SME upload failed"}
    
    # Define async vector store creation function
    async def create_vector_store_async(course_id: str):
        """Background task to create vector store."""
        try:
            logger.info(f"Starting vector store creation for course {course_id}")
            
            # Update status in MongoDB
            mongo_db["course_vector_stores"].update_one(
                {"course_id": course_id},
                {
                    "$set": {
                        "status": "creating",
                        "started_at": datetime.utcnow(),
                        "error": None,
                        "failed_at": None
                    }
                },
                upsert=True
            )
            
            # Create vector store (this may take time for large/many files)
            result = sme_client.create_vector_store(course_id)
            
            # Update status to completed
            mongo_db["course_vector_stores"].update_one(
                {"course_id": course_id},
                {
                    "$set": {
                        "status": "ready",
                        "completed_at": datetime.utcnow(),
                        "message": result.get("message", "Vector store created")
                    }
                }
            )
            
            logger.info(f"Vector store created successfully for course {course_id}")
            
        except Exception as e:
            logger.error(f"Failed to create vector store for course {course_id}: {e}")
            # Update status to failed
            mongo_db["course_vector_stores"].update_one(
                {"course_id": course_id},
                {
                    "$set": {
                        "status": "failed",
                        "error": str(e),
                        "failed_at": datetime.utcnow()
                    }
                }
            )
    
    # Check if we should trigger vector store creation
    vs_status = None
    vs_message = "Vector store creation not triggered (create_vector_store=False)"
    
    if create_vector_store:
        # Check if vector store is already being created or is ready
        vs_status_doc = mongo_db["course_vector_stores"].find_one({"course_id": courseid})
        
        if vs_status_doc:
            current_status = vs_status_doc.get("status")
            if current_status == "creating":
                logger.info(f"Vector store creation already in progress for course {courseid}")
                vs_message = "Vector store creation already in progress. Please wait."
                vs_status = "creating"
            elif current_status == "ready":
                logger.info(f"Vector store already exists for course {courseid}. Recreating with new files...")
                vs_message = "Recreating vector store with newly uploaded files"
                vs_status = "recreating"
                # Trigger recreation
                asyncio.create_task(create_vector_store_async(courseid))
            else:
                # Failed or not started - trigger creation
                logger.info(f"Triggering vector store creation for course {courseid}")
                vs_message = "Vector store creation started in background"
                vs_status = "creating"
                asyncio.create_task(create_vector_store_async(courseid))
        else:
            # No vector store status yet - trigger creation
            logger.info(f"Triggering vector store creation for course {courseid}")
            vs_message = "Vector store creation started in background"
            vs_status = "creating"
            asyncio.create_task(create_vector_store_async(courseid))
    
    return schemas.FileUploadToSMEResponse(
        courseid=courseid,
        uploaded_files=uploaded_files_metadata,
        sme_response=sme_response,
        mongo_file_ids=mongo_file_ids,
        vector_store_status=vs_status,
        vector_store_message=vs_message
    )


@router.post("/courses/{courseid}/create-vector-store", response_model=schemas.VectorStoreResponse)
def create_course_vector_store(
    courseid: str,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db)
):
    """
    Manually create vector store for course in SME service.
    Note: This is now automatically triggered after file upload.
    Use this endpoint only if you need to recreate the vector store.
    """
    from sme_client import sme_client
    
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
    
    # Create vector store in SME
    sme_response = sme_client.create_vector_store(courseid)
    
    return schemas.VectorStoreResponse(
        courseid=courseid,
        message=sme_response.get("message", "Vector store created successfully"),
        status="success"
    )


@router.get("/courses/{courseid}/vector-store-status")
def get_vector_store_status(
    courseid: str,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """
    Check the status of vector store creation for a course.
    
    Possible statuses:
    - "not_started": No files uploaded yet or vector store not created
    - "creating": Vector store is being created (background task running)
    - "ready": Vector store is ready for use
    - "failed": Vector store creation failed
    """
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
    
    # Get vector store status from MongoDB
    vs_status = mongo_db["course_vector_stores"].find_one({"course_id": courseid})
    
    if not vs_status:
        return {
            "course_id": courseid,
            "status": "not_started",
            "message": "No vector store created yet. Upload files first."
        }
    
    return {
        "course_id": courseid,
        "status": vs_status.get("status", "unknown"),
        "message": vs_status.get("message", ""),
        "started_at": vs_status.get("started_at"),
        "completed_at": vs_status.get("completed_at"),
        "failed_at": vs_status.get("failed_at"),
        "error": vs_status.get("error")
    }


@router.post("/courses/{courseid}/generate-los", response_model=schemas.LOGenerationResponse)
def generate_learning_objectives(
    courseid: str,
    request: schemas.GenerateLORequest,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """
    Generate learning objectives for course modules using SME service.
    The module names should already exist in the database.
    The vector store must be ready before generating LOs.
    """
    from sme_client import sme_client
    
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
    
    # Check vector store status
    vs_status = mongo_db["course_vector_stores"].find_one({"course_id": courseid})
    
    if not vs_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded yet. Please upload course materials first."
        )
    
    if vs_status.get("status") == "creating":
        raise HTTPException(
            status_code=status.HTTP_425_TOO_EARLY,
            detail="Vector store is still being created. Please wait a moment and try again."
        )
    
    if vs_status.get("status") == "failed":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector store creation failed: {vs_status.get('error', 'Unknown error')}"
        )
    
    if vs_status.get("status") != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vector store is not ready. Please upload files first."
        )
    
    # Validate that all modules exist
    for module_name in request.module_names:
        # Find module by title in this course
        module = db.query(models.Module).filter(
            models.Module.courseid == courseid,
            models.Module.title == module_name
        ).first()
        
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module '{module_name}' not found in course"
            )
    
    # Generate LOs using SME
    module_objectives = sme_client.generate_learning_objectives(
        courseid=courseid,
        module_names=request.module_names,
        n_los=request.n_los
    )
    
    # Store LOs in MongoDB for each module
    for module_name, objectives in module_objectives.items():
        # Get module ID
        module = db.query(models.Module).filter(
            models.Module.courseid == courseid,
            models.Module.title == module_name
        ).first()
        
        if module:
            # Store in MongoDB
            lo_document = {
                "module_id": module.moduleid,
                "course_id": courseid,
                "module_name": module_name,
                "learning_objectives": [
                    {
                        "objective_id": f"lo_{i+1}",
                        "text": obj,
                        "order_index": i,
                        "generated_by_sme": True,
                        "edited": False
                    }
                    for i, obj in enumerate(objectives)
                ],
                "generated_at": datetime.utcnow(),
                "last_modified": datetime.utcnow()
            }
            
            # Upsert (update if exists, insert if not)
            mongo_db["learning_objectives"].update_one(
                {"module_id": module.moduleid},
                {"$set": lo_document},
                upsert=True
            )
    
    return schemas.LOGenerationResponse(
        courseid=courseid,
        module_objectives=module_objectives,
        status="success"
    )


@router.get("/modules/{moduleid}/learning-objectives")
def get_module_learning_objectives(
    moduleid: str,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """Get learning objectives for a specific module."""
    # Get module and verify ownership
    module = db.query(models.Module).filter(
        models.Module.moduleid == moduleid
    ).first()
    
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    course = crud.CourseCRUD.get_by_id(db, module.courseid)
    if course.instructorid != current_instructor.instructorid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this module"
        )
    
    # Get LOs from MongoDB
    lo_doc = mongo_db["learning_objectives"].find_one({"module_id": moduleid})
    
    if not lo_doc:
        return {
            "module_id": moduleid,
            "learning_objectives": [],
            "message": "No learning objectives generated yet"
        }
    
    return {
        "module_id": moduleid,
        "module_name": lo_doc.get("module_name"),
        "learning_objectives": lo_doc.get("learning_objectives", []),
        "generated_at": lo_doc.get("generated_at"),
        "last_modified": lo_doc.get("last_modified")
    }


@router.put("/modules/{moduleid}/learning-objectives")
def update_module_learning_objectives(
    moduleid: str,
    request: schemas.UpdateLORequest,
    current_instructor: models.Instructor = Depends(get_current_instructor),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """
    Update/edit learning objectives for a module.
    Instructors can modify the AI-generated LOs before finalizing them.
    """
    from datetime import datetime
    
    # Get module and verify ownership
    module = db.query(models.Module).filter(
        models.Module.moduleid == moduleid
    ).first()
    
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    course = crud.CourseCRUD.get_by_id(db, module.courseid)
    if course.instructorid != current_instructor.instructorid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this module"
        )
    
    # Format the learning objectives
    formatted_los = [
        {
            "objective_id": f"lo_{i+1}",
            "text": obj,
            "order_index": i,
            "generated_by_sme": False,
            "edited": True
        }
        for i, obj in enumerate(request.learning_objectives)
    ]
    
    # Update in MongoDB
    result = mongo_db["learning_objectives"].update_one(
        {"module_id": moduleid},
        {
            "$set": {
                "learning_objectives": formatted_los,
                "last_modified": datetime.utcnow(),
                "manually_edited": True
            }
        },
        upsert=True
    )
    
    return {
        "module_id": moduleid,
        "learning_objectives": formatted_los,
        "status": "success",
        "message": "Learning objectives updated successfully"
    }