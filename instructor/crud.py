from sqlalchemy.orm import Session
from typing import Optional, List, Any, Dict
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
            learning_intent=module_create.learning_intent,
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
        """Delete module and its dependent learner progress records."""
        from sqlalchemy import text
        
        db_module = db.query(models.Module).filter(
            models.Module.moduleid == moduleid
        ).first()
        
        if not db_module:
            return False
        
        # Delete learner module progress referencing this module first
        # (this FK doesn't have ON DELETE CASCADE in the database)
        delete_progress_query = text("""
            DELETE FROM learnermoduleprogress 
            WHERE moduleid = :moduleid
        """)
        db.execute(delete_progress_query, {"moduleid": moduleid})
        
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
            "course_id": None,
            "module_name": None,
            "learning_intent": None,
            "learning_objectives": [],
            "approval_status": "not_started",
            "golden_sample_status": "not_started",
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
        order_index = len(doc.get("learning_objectives", doc.get("objectives", [])))
        
        # Create new objective
        new_objective = {
            "objective_id": str(uuid.uuid4()),
            "text": objective_text,
            "order_index": order_index,
            "generated_by_kli": False,
            "generated_by_sme": False,
            "edited": True,
            "approved": False,
        }
        
        # Update document
        collection.update_one(
            {"module_id": module_id},
            {
                "$push": {"learning_objectives": new_objective},
                "$set": {
                    "updated_at": datetime.utcnow(),
                    "approval_status": "pending_review",
                    "golden_sample_status": "stale",
                }
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
                "learning_objectives.objective_id": objective_id
            },
            {
                "$set": {
                    "learning_objectives.$.text": new_text,
                    "learning_objectives.$.edited": True,
                    "learning_objectives.$.approved": False,
                    "updated_at": datetime.utcnow(),
                    "approval_status": "pending_review",
                    "golden_sample_status": "stale",
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
                "$pull": {"learning_objectives": {"objective_id": objective_id}},
                "$set": {
                    "updated_at": datetime.utcnow(),
                    "approval_status": "pending_review",
                    "golden_sample_status": "stale",
                }
            }
        )
        
        if result.modified_count > 0:
            return collection.find_one({"module_id": module_id})
        return None

    @staticmethod
    def replace_objectives(
        mongo_db,
        *,
        module_id: str,
        course_id: str,
        module_name: str,
        learning_intent: Optional[str],
        objectives: List[Dict[str, Any]],
        approval_status: str = "pending_review",
        golden_sample_status: str = "not_started",
    ) -> dict:
        """Replace the objective list for a module with richer KLI metadata."""
        collection = mongo_db["learning_objectives"]
        now = datetime.utcnow()
        payload = []
        for index, objective in enumerate(objectives):
            payload.append(
                {
                    "objective_id": objective.get("objective_id") or f"lo_{index + 1}",
                    "text": objective.get("text", "").strip(),
                    "order_index": index,
                    "generated_by_kli": objective.get("generated_by_kli"),
                    "generated_by_sme": objective.get("generated_by_sme"),
                    "edited": objective.get("edited"),
                    "approved": objective.get("approved"),
                    "knowledge_component": objective.get("knowledge_component"),
                    "learning_process": objective.get("learning_process"),
                    "instructional_principle": objective.get("instructional_principle"),
                    "rationale": objective.get("rationale"),
                }
            )

        collection.update_one(
            {"module_id": module_id},
            {
                "$set": {
                    "course_id": course_id,
                    "module_name": module_name,
                    "learning_intent": learning_intent,
                    "learning_objectives": payload,
                    "approval_status": approval_status,
                    "golden_sample_status": golden_sample_status,
                    "last_modified": now,
                    "updated_at": now,
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        return collection.find_one({"module_id": module_id})

    @staticmethod
    def mark_module_stale(mongo_db, module_id: str) -> None:
        """Mark learning objectives and golden sample as needing re-approval."""
        mongo_db["learning_objectives"].update_one(
            {"module_id": module_id},
            {
                "$set": {
                    "approval_status": "pending_review",
                    "golden_sample_status": "stale",
                    "last_modified": datetime.utcnow(),
                }
            },
        )


class GoldenSampleCRUD:
    """CRUD operations for instructor-approved golden samples in MongoDB."""

    @staticmethod
    def get_by_module(mongo_db, module_id: str) -> Optional[dict]:
        collection = mongo_db["golden_samples"]
        return collection.find_one({"module_id": module_id})

    @staticmethod
    def save_generated(
        mongo_db,
        *,
        course_id: str,
        module_id: str,
        module_name: str,
        learning_intent: Optional[str],
        source_learning_objectives: List[str],
        golden_sample: str,
        subtopics: List[Dict[str, Any]],
        sections: Dict[str, str],
    ) -> dict:
        collection = mongo_db["golden_samples"]
        now = datetime.utcnow()
        collection.update_one(
            {"module_id": module_id},
            {
                "$set": {
                    "course_id": course_id,
                    "module_id": module_id,
                    "module_name": module_name,
                    "learning_intent": learning_intent,
                    "source_learning_objectives": source_learning_objectives,
                    "golden_sample": golden_sample,
                    "subtopics": subtopics,
                    "sections": sections,
                    "status": "generated",
                    "generated_at": now,
                    "updated_at": now,
                    "edited_by_instructor": False,
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        return collection.find_one({"module_id": module_id})

    @staticmethod
    def update_markdown(mongo_db, *, module_id: str, golden_sample: str) -> Optional[dict]:
        collection = mongo_db["golden_samples"]
        result = collection.update_one(
            {"module_id": module_id},
            {
                "$set": {
                    "golden_sample": golden_sample,
                    "status": "edited",
                    "edited_by_instructor": True,
                    "updated_at": datetime.utcnow(),
                }
            },
        )
        if result.matched_count == 0:
            return None
        return collection.find_one({"module_id": module_id})

    @staticmethod
    def delete_by_course(mongo_db, course_id: str) -> None:
        mongo_db["golden_samples"].delete_many({"course_id": course_id})

    @staticmethod
    def delete_by_module(mongo_db, module_id: str) -> None:
        mongo_db["golden_samples"].delete_one({"module_id": module_id})


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
