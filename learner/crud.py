from sqlalchemy.orm import Session
from models import Learner
from schemas import LearnerCreate
from auth import hash_password, verify_password
import uuid
from typing import Optional


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