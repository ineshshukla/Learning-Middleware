from sqlalchemy.orm import Session
from typing import Optional, List
import uuid
from datetime import datetime
import os
from fastapi import UploadFile
import models
import schemas
from auth import hash_password, verify_password


class InstructorCRUD:
    """CRUD operations for Instructor."""
    
    @staticmethod
    def create(db: Session, instructor_create: schemas.InstructorCreate) -> models.Instructor:
        """Create a new instructor with auto-generated ID."""
        hashed_password = hash_password(instructor_create.password)
        
        # Generate unique instructor ID
        instructorid = f"INST_{uuid.uuid4().hex[:12].upper()}"
        
        db_instructor = models.Instructor(
            instructorid=instructorid,
            email=instructor_create.email,
            password_hash=hashed_password,
            first_name=instructor_create.first_name,
            last_name=instructor_create.last_name
        )
        
        db.add(db_instructor)
        db.commit()
        db.refresh(db_instructor)
        return db_instructor
    
    @staticmethod
    def get_by_id(db: Session, instructorid: str) -> Optional[models.Instructor]:
        """Get instructor by ID."""
        return db.query(models.Instructor).filter(
            models.Instructor.instructorid == instructorid
        ).first()
    
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[models.Instructor]:
        """Get instructor by email."""
        return db.query(models.Instructor).filter(
            models.Instructor.email == email
        ).first()
    
    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> Optional[models.Instructor]:
        """Authenticate an instructor by email."""
        instructor = InstructorCRUD.get_by_email(db, email)
        if not instructor:
            return None
        if not verify_password(password, instructor.password_hash):
            return None
        return instructor


class CourseCRUD:
    """CRUD operations for Course."""
    
    @staticmethod
    def create(db: Session, course_create: schemas.CourseCreate, instructorid: str) -> models.Course:
        """Create a new course with auto-generated ID."""
        # Generate unique course ID
        courseid = f"COURSE_{uuid.uuid4().hex[:10].upper()}"
        
        db_course = models.Course(
            courseid=courseid,
            instructorid=instructorid,
            course_name=course_create.course_name,
            coursedescription=course_create.coursedescription,
            targetaudience=course_create.targetaudience,
            prereqs=course_create.prereqs
        )
        
        db.add(db_course)
        db.commit()
        db.refresh(db_course)
        return db_course
    
    @staticmethod
    def get_by_id(db: Session, courseid: str) -> Optional[models.Course]:
        """Get course by ID."""
        return db.query(models.Course).filter(
            models.Course.courseid == courseid
        ).first()
    
    @staticmethod
    def get_all_by_instructor(db: Session, instructorid: str) -> List[models.Course]:
        """Get all courses by instructor."""
        return db.query(models.Course).filter(
            models.Course.instructorid == instructorid
        ).all()
    
    @staticmethod
    def delete(db: Session, courseid: str) -> bool:
        """Delete a course by ID with proper cascading."""
        from sqlalchemy import text
        
        course = db.query(models.Course).filter(
            models.Course.courseid == courseid
        ).first()
        
        if not course:
            return False
        
        # Get all modules for this course
        modules = db.query(models.Module).filter(
            models.Module.courseid == courseid
        ).all()
        
        module_ids = [module.moduleid for module in modules]
        
        # Step 1: Delete learner module progress for all modules in this course
        if module_ids:
            delete_progress_query = text("""
                DELETE FROM learnermoduleprogress 
                WHERE moduleid = ANY(:module_ids)
            """)
            db.execute(delete_progress_query, {"module_ids": module_ids})
        
        # Step 2: Now delete the course (which will cascade to modules, enrollments, coursecontent)
        db.delete(course)
        db.commit()
        return True


class ModuleCRUD:
    """CRUD operations for Module."""
    
    @staticmethod
    def create(db: Session, module_create: schemas.ModuleCreate) -> models.Module:
        """Create a new module."""
        db_module = models.Module(
            moduleid=module_create.moduleid,
            courseid=module_create.courseid,
            title=module_create.title,
            description=module_create.description,
            order_index=module_create.order_index,
            content_path=module_create.content_path
        )
        
        db.add(db_module)
        db.commit()
        db.refresh(db_module)
        return db_module
    
    @staticmethod
    def get_by_course(db: Session, courseid: str) -> List[models.Module]:
        """Get all modules for a course."""
        return db.query(models.Module).filter(
            models.Module.courseid == courseid
        ).order_by(models.Module.order_index).all()
    
    @staticmethod
    def get_by_id(db: Session, moduleid: str) -> Optional[models.Module]:
        """Get module by ID."""
        return db.query(models.Module).filter(
            models.Module.moduleid == moduleid
        ).first()
    
    @staticmethod
    def update(db: Session, moduleid: str, module_update: schemas.ModuleUpdate) -> Optional[models.Module]:
        """Update module."""
        db_module = db.query(models.Module).filter(
            models.Module.moduleid == moduleid
        ).first()
        
        if not db_module:
            return None
        
        update_data = module_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_module, field, value)
        
        db.commit()
        db.refresh(db_module)
        return db_module
    
    @staticmethod
    def delete(db: Session, moduleid: str) -> bool:
        """Delete module."""
        db_module = db.query(models.Module).filter(
            models.Module.moduleid == moduleid
        ).first()
        
        if not db_module:
            return False
        
        db.delete(db_module)
        db.commit()
        return True


class LearningObjectivesCRUD:
    """CRUD operations for Learning Objectives in MongoDB."""
    
    @staticmethod
    def get_objectives(mongo_db, module_id: str) -> Optional[dict]:
        """Get learning objectives for a module."""
        collection = mongo_db["learning_objectives"]
        return collection.find_one({"module_id": module_id})
    
    @staticmethod
    def create_objectives(mongo_db, module_id: str) -> dict:
        """Create empty learning objectives document for a module."""
        collection = mongo_db["learning_objectives"]
        doc = {
            "module_id": module_id,
            "objectives": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        collection.insert_one(doc)
        return doc
    
    @staticmethod
    def add_objective(mongo_db, module_id: str, objective_text: str) -> dict:
        """Add a learning objective to a module."""
        collection = mongo_db["learning_objectives"]
        
        # Get existing objectives or create new
        doc = collection.find_one({"module_id": module_id})
        if not doc:
            doc = LearningObjectivesCRUD.create_objectives(mongo_db, module_id)
        
        # Calculate order index
        order_index = len(doc.get("objectives", []))
        
        # Create new objective
        new_objective = {
            "objective_id": str(uuid.uuid4()),
            "text": objective_text,
            "order_index": order_index
        }
        
        # Update document
        collection.update_one(
            {"module_id": module_id},
            {
                "$push": {"objectives": new_objective},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return collection.find_one({"module_id": module_id})
    
    @staticmethod
    def update_objective(mongo_db, module_id: str, objective_id: str, new_text: str) -> Optional[dict]:
        """Update a learning objective."""
        collection = mongo_db["learning_objectives"]
        
        result = collection.update_one(
            {
                "module_id": module_id,
                "objectives.objective_id": objective_id
            },
            {
                "$set": {
                    "objectives.$.text": new_text,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            return collection.find_one({"module_id": module_id})
        return None
    
    @staticmethod
    def remove_objective(mongo_db, module_id: str, objective_id: str) -> Optional[dict]:
        """Remove a learning objective."""
        collection = mongo_db["learning_objectives"]
        
        result = collection.update_one(
            {"module_id": module_id},
            {
                "$pull": {"objectives": {"objective_id": objective_id}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count > 0:
            return collection.find_one({"module_id": module_id})
        return None


class FileCRUD:
    """CRUD operations for File uploads in MongoDB."""
    
    @staticmethod
    def upload_file(mongo_db, course_id: str, file: UploadFile, upload_dir: str) -> dict:
        """Upload a file for a course to SME data directory."""
        from pathlib import Path
        
        # Get project root (assuming instructor module is at same level as sme)
        project_root = Path(__file__).parent.parent
        sme_docs_dir = project_root / "sme" / "data" / "docs" / course_id
        
        # Create course directory if not exists
        sme_docs_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{file_id}{file_extension}"
        file_path = sme_docs_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as f:
            content = file.file.read()
            f.write(content)
        
        # Create metadata
        file_metadata = {
            "file_id": file_id,
            "filename": file.filename,
            "file_path": str(file_path),  # Store full path
            "file_type": file.content_type,
            "file_size": len(content),
            "uploaded_at": datetime.utcnow()
        }
        
        # Store in MongoDB
        collection = mongo_db["course_files"]
        doc = collection.find_one({"course_id": course_id})
        
        if doc:
            collection.update_one(
                {"course_id": course_id},
                {
                    "$push": {"files": file_metadata},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
        else:
            collection.insert_one({
                "course_id": course_id,
                "files": [file_metadata],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
        
        print(f"✓ File uploaded successfully to: {file_path}")
        return file_metadata
    
    @staticmethod
    def get_files(mongo_db, course_id: str) -> List[dict]:
        """Get all files for a course."""
        collection = mongo_db["course_files"]
        doc = collection.find_one({"course_id": course_id})
        
        if doc:
            return doc.get("files", [])
        return []