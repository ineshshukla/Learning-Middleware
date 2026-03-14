from sqlalchemy.orm import Session
from typing import Optional, List
import uuid
from datetime import datetime
import os
from fastapi import UploadFile
from pymongo import ReturnDocument
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


class KliPipelineCRUD:
    """CRUD operations for async KLI pipeline jobs in MongoDB."""

    COLLECTION = "kli_pipeline_jobs"

    @staticmethod
    def _is_active_status(status: str) -> bool:
        return status in {
            "queued",
            "planning",
            "plan_review_pending",
            "golden_generating",
            "golden_review_pending",
            "personalization_ready",
        }

    @staticmethod
    def _normalize_job(job: dict) -> dict:
        """Normalize mongo doc into API-friendly shape."""
        return {
            "job_id": job.get("job_id"),
            "course_id": job.get("course_id"),
            "module_id": job.get("module_id"),
            "module_title": job.get("module_title"),
            "lo_id": job.get("lo_id"),
            "lo_text": job.get("lo_text", ""),
            "status": job.get("status", "queued"),
            "stage": job.get("stage", "waiting"),
            "created_at": job.get("created_at"),
            "updated_at": job.get("updated_at"),
            "approved": bool(job.get("approved", False)),
            "plan_ready": bool(job.get("plan") is not None),
            "golden_ready": bool(job.get("golden_sample") is not None),
            "error": job.get("error"),
        }

    @staticmethod
    def initialize_course_jobs(
        mongo_db,
        course_id: str,
        module_lo_payload: List[dict],
        instructor_id: Optional[str] = None,
        reset_existing: bool = False,
    ) -> dict:
        """Queue one async job per LO for the course."""
        collection = mongo_db[KliPipelineCRUD.COLLECTION]
        now = datetime.utcnow()

        queued = 0
        skipped = 0
        jobs = []

        for item in module_lo_payload:
            module_id = item["module_id"]
            module_title = item.get("module_title")
            lo_id = item["lo_id"]
            lo_text = item["lo_text"]

            existing = collection.find_one(
                {
                    "course_id": course_id,
                    "module_id": module_id,
                    "lo_id": lo_id,
                    **({"instructor_id": instructor_id} if instructor_id else {}),
                }
            )

            if existing and not reset_existing and KliPipelineCRUD._is_active_status(existing.get("status", "queued")):
                skipped += 1
                jobs.append(KliPipelineCRUD._normalize_job(existing))
                continue

            if existing and reset_existing:
                collection.delete_one({"_id": existing["_id"]})

            job_doc = {
                "job_id": f"kli_job_{uuid.uuid4().hex}",
                "course_id": course_id,
                "instructor_id": instructor_id,
                "module_id": module_id,
                "module_title": module_title,
                "lo_id": lo_id,
                "lo_text": lo_text,
                "status": "queued",
                "stage": "waiting_for_worker",
                "approved": False,
                "plan": None,
                "golden_sample": None,
                "review": {
                    "plan_review": None,
                    "golden_review": None,
                },
                "error": None,
                "created_at": now,
                "updated_at": now,
            }
            collection.insert_one(job_doc)
            queued += 1
            jobs.append(KliPipelineCRUD._normalize_job(job_doc))

        return {
            "queued_jobs": queued,
            "skipped_jobs": skipped,
            "jobs": jobs,
        }

    @staticmethod
    def list_course_jobs(mongo_db, course_id: str) -> List[dict]:
        """List all LO jobs for a course ordered by update time."""
        collection = mongo_db[KliPipelineCRUD.COLLECTION]
        cursor = collection.find({"course_id": course_id}).sort("updated_at", -1)
        return [KliPipelineCRUD._normalize_job(job) for job in cursor]

    @staticmethod
    def list_course_jobs_for_instructor(mongo_db, course_id: str, instructor_id: str) -> List[dict]:
        """List LO jobs for a course scoped to one instructor."""
        collection = mongo_db[KliPipelineCRUD.COLLECTION]
        cursor = collection.find(
            {"course_id": course_id, "instructor_id": instructor_id}
        ).sort("updated_at", -1)
        return [KliPipelineCRUD._normalize_job(job) for job in cursor]

    @staticmethod
    def get_job_detail(
        mongo_db,
        course_id: str,
        job_id: str,
        instructor_id: Optional[str] = None,
    ) -> Optional[dict]:
        """Fetch a detailed job document for review workflows."""
        collection = mongo_db[KliPipelineCRUD.COLLECTION]
        query = {"course_id": course_id, "job_id": job_id}
        if instructor_id:
            query["instructor_id"] = instructor_id
        job = collection.find_one(query)
        if not job:
            return None

        summary = KliPipelineCRUD._normalize_job(job)
        summary["plan"] = job.get("plan")
        summary["golden_sample"] = job.get("golden_sample")
        summary["review"] = job.get("review")
        return summary

    @staticmethod
    def claim_next_queued_job(mongo_db, course_id: str) -> Optional[dict]:
        """Atomically claim the next queued job for processing."""
        collection = mongo_db[KliPipelineCRUD.COLLECTION]
        claimed = collection.find_one_and_update(
            {"course_id": course_id, "status": "queued"},
            {
                "$set": {
                    "status": "planning",
                    "stage": "quorum_planning",
                    "updated_at": datetime.utcnow(),
                    "error": None,
                }
            },
            sort=[("created_at", 1)],
            return_document=ReturnDocument.AFTER,
        )
        if not claimed:
            return None
        return claimed

    @staticmethod
    def mark_job_plan_ready(
        mongo_db,
        course_id: str,
        job_id: str,
        plan: dict,
        golden_candidate: Optional[dict] = None,
    ) -> Optional[dict]:
        """Store plan and move to instructor plan review."""
        collection = mongo_db[KliPipelineCRUD.COLLECTION]
        update_doc = {
            "status": "plan_review_pending",
            "stage": "awaiting_plan_review",
            "plan": plan,
            "updated_at": datetime.utcnow(),
            "error": None,
        }
        if golden_candidate is not None:
            update_doc["golden_candidate"] = golden_candidate

        result = collection.find_one_and_update(
            {"course_id": course_id, "job_id": job_id},
            {"$set": update_doc},
            return_document=ReturnDocument.AFTER,
        )
        if not result:
            return None
        return KliPipelineCRUD._normalize_job(result)

    @staticmethod
    def mark_job_failed(mongo_db, course_id: str, job_id: str, error: str) -> Optional[dict]:
        """Mark a job failed with the given error message."""
        collection = mongo_db[KliPipelineCRUD.COLLECTION]
        result = collection.find_one_and_update(
            {"course_id": course_id, "job_id": job_id},
            {
                "$set": {
                    "status": "failed",
                    "stage": "failed",
                    "error": error,
                    "updated_at": datetime.utcnow(),
                }
            },
            return_document=ReturnDocument.AFTER,
        )
        if not result:
            return None
        return KliPipelineCRUD._normalize_job(result)

    @staticmethod
    def get_course_status(
        mongo_db,
        course_id: str,
        instructor_id: Optional[str] = None,
    ) -> dict:
        """Aggregate course-level pipeline status counters and current active job."""
        if instructor_id:
            jobs = KliPipelineCRUD.list_course_jobs_for_instructor(
                mongo_db, course_id, instructor_id
            )
        else:
            jobs = KliPipelineCRUD.list_course_jobs(mongo_db, course_id)

        in_progress_set = {"planning", "golden_generating", "personalization_ready"}
        review_pending_set = {"plan_review_pending", "golden_review_pending"}

        queued_jobs = sum(1 for j in jobs if j["status"] == "queued")
        in_progress_jobs = sum(1 for j in jobs if j["status"] in in_progress_set)
        review_pending_jobs = sum(1 for j in jobs if j["status"] in review_pending_set)
        approved_jobs = sum(1 for j in jobs if j["status"] == "approved")
        failed_jobs = sum(1 for j in jobs if j["status"] == "failed")

        current_job = None
        for job in jobs:
            if job["status"] in ("planning", "golden_generating"):
                current_job = job
                break

        return {
            "courseid": course_id,
            "total_jobs": len(jobs),
            "queued_jobs": queued_jobs,
            "in_progress_jobs": in_progress_jobs,
            "review_pending_jobs": review_pending_jobs,
            "approved_jobs": approved_jobs,
            "failed_jobs": failed_jobs,
            "current_job": current_job,
            "jobs": jobs,
        }

    @staticmethod
    def update_job_state(
        mongo_db,
        course_id: str,
        job_id: str,
        status: str,
        stage: Optional[str] = None,
        plan: Optional[dict] = None,
        golden_sample: Optional[dict] = None,
        error: Optional[str] = None,
    ) -> Optional[dict]:
        """Update job state from worker orchestration."""
        collection = mongo_db[KliPipelineCRUD.COLLECTION]
        update_doc = {
            "status": status,
            "updated_at": datetime.utcnow(),
            "error": error,
        }
        if stage is not None:
            update_doc["stage"] = stage
        if plan is not None:
            update_doc["plan"] = plan
        if golden_sample is not None:
            update_doc["golden_sample"] = golden_sample

        result = collection.find_one_and_update(
            {"course_id": course_id, "job_id": job_id},
            {"$set": update_doc},
            return_document=ReturnDocument.AFTER,
        )

        if not result:
            return None
        return KliPipelineCRUD._normalize_job(result)

    @staticmethod
    def review_plan(
        mongo_db,
        course_id: str,
        job_id: str,
        approved: bool,
        edited_plan: Optional[dict],
        review_notes: Optional[str],
    ) -> Optional[dict]:
        """Save instructor plan review decision."""
        collection = mongo_db[KliPipelineCRUD.COLLECTION]
        job = collection.find_one({"course_id": course_id, "job_id": job_id})
        if not job:
            return None

        # KLI currently returns a golden candidate while planning.
        # Once instructor approves the plan, we surface that candidate for golden review.
        next_status = "golden_review_pending" if approved else "plan_review_pending"
        next_stage = "awaiting_golden_review" if approved else "plan_needs_instructor_changes"

        update_doc = {
            "status": next_status,
            "stage": next_stage,
            "updated_at": datetime.utcnow(),
            "review.plan_review": {
                "approved": approved,
                "review_notes": review_notes,
                "reviewed_at": datetime.utcnow(),
            },
        }
        if edited_plan is not None:
            update_doc["plan"] = edited_plan
        if approved and job.get("golden_candidate"):
            update_doc["golden_sample"] = job.get("golden_candidate")

        result = collection.find_one_and_update(
            {"course_id": course_id, "job_id": job_id},
            {"$set": update_doc},
            return_document=ReturnDocument.AFTER,
        )
        if not result:
            return None
        return KliPipelineCRUD._normalize_job(result)

    @staticmethod
    def review_golden_sample(
        mongo_db,
        course_id: str,
        job_id: str,
        approved: bool,
        edited_golden_sample: Optional[dict],
        review_notes: Optional[str],
    ) -> Optional[dict]:
        """Save instructor golden-sample review decision."""
        collection = mongo_db[KliPipelineCRUD.COLLECTION]
        next_status = "approved" if approved else "golden_review_pending"
        update_doc = {
            "status": next_status,
            "approved": approved,
            "stage": "approved_ready_for_personalization" if approved else "golden_needs_instructor_changes",
            "updated_at": datetime.utcnow(),
            "review.golden_review": {
                "approved": approved,
                "review_notes": review_notes,
                "reviewed_at": datetime.utcnow(),
            },
        }
        if edited_golden_sample is not None:
            update_doc["golden_sample"] = edited_golden_sample

        result = collection.find_one_and_update(
            {"course_id": course_id, "job_id": job_id},
            {"$set": update_doc},
            return_document=ReturnDocument.AFTER,
        )
        if not result:
            return None
        return KliPipelineCRUD._normalize_job(result)