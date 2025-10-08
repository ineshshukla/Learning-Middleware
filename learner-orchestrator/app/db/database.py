"""
Database connection and session management.

This module handles:
1. PostgreSQL connection using SQLAlchemy
2. MongoDB connection using PyMongo
3. Database session dependencies for FastAPI

Usage Examples:

PostgreSQL:
    from app.db.database import get_db
    from fastapi import Depends
    from sqlalchemy.orm import Session
    
    @router.get("/endpoint")
    def endpoint(db: Session = Depends(get_db)):
        # Use db session here
        results = db.query(Model).all()
        return results

MongoDB:
    from app.db.database import get_preferences_collection
    
    @router.get("/preferences")
    def get_prefs():
        collection = get_preferences_collection()
        data = collection.find_one({"_id": {"LearnerID": "123"}})
        return data
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pymongo import MongoClient
from typing import Generator
from app.core.config import settings


# ============================================================================
# PostgreSQL Database Setup
# ============================================================================

# Create SQLAlchemy engine with connection pooling
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,      # Verify connections before using
    pool_recycle=3600,       # Recycle connections after 1 hour
)

# SessionLocal class for creating database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for SQLAlchemy models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency for PostgreSQL database session.
    
    Yields:
        Session: SQLAlchemy database session
    
    Usage:
        @router.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    
    Note:
        Session is automatically closed after request completion
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# MongoDB Connection Setup
# ============================================================================

# Create MongoDB client
mongo_client = MongoClient(settings.mongo_url)

# Get MongoDB database instance
mongo_db = mongo_client[settings.mongo_db_name]


def get_mongo_db():
    """
    Get MongoDB database instance.
    
    Returns:
        Database: PyMongo database object
    
    Usage:
        db = get_mongo_db()
        collection = db["collection_name"]
        data = collection.find_one({"key": "value"})
    """
    return mongo_db


# ============================================================================
# MongoDB Collection Helpers
# ============================================================================

def get_coursecontent_collection():
    """
    Get coursecontent collection (module content from SME).
    
    Structure:
        {
            "_id": {"CourseID": "CSE101", "LearnerID": "uuid"},
            "modules": [...],
            "lastUpdated": "2025-10-09T..."
        }
    
    Returns:
        Collection: PyMongo collection object
    """
    return mongo_db["coursecontent"]


def get_quizcontent_collection():
    """
    Get quizcontent collection (quiz questions from SME).
    
    Structure:
        {
            "_id": {"ModuleID": "CSE101_M1", "LearnerID": "uuid"},
            "questions": [...],
            "lastUpdated": "2025-10-09T..."
        }
    
    Returns:
        Collection: PyMongo collection object
    """
    return mongo_db["quizcontent"]


def get_learnerresponse_collection():
    """
    Get learnerresponse collection (quiz answers from learner).
    
    Structure:
        {
            "_id": {"LearnerID": "uuid", "QuizID": "quiz123"},
            "responses": [...],
            "score": 85.5,
            "submittedAt": "2025-10-09T..."
        }
    
    Returns:
        Collection: PyMongo collection object
    """
    return mongo_db["learnerresponse"]


def get_preferences_collection():
    """
    Get coursecontent_pref collection (learner content preferences).
    
    Structure:
        {
            "_id": {"CourseID": "CSE101", "LearnerID": "uuid"},
            "preferences": {
                "detail_level": "moderate",
                "explanation_style": "example-heavy",
                "language": "simple"
            },
            "lastUpdated": "2025-10-09T..."
        }
    
    Returns:
        Collection: PyMongo collection object
    """
    return mongo_db["coursecontent_pref"]


def get_library_collection():
    """
    Get library collection (instructor uploaded materials).
    
    Structure:
        {
            "_id": "doc123",
            "courseID": "CSE101",
            "instructorID": "inst_001",
            "title": "Advanced Topics",
            "content": "...",
            "uploadedAt": "2025-10-09T..."
        }
    
    Returns:
        Collection: PyMongo collection object
    """
    return mongo_db["library"]


def get_learning_objectives_collection():
    """
    Get courselearningobjective collection (course learning objectives).
    
    Structure:
        {
            "_id": "CSE101",
            "objectives": [
                "Understand basic programming concepts",
                "Write simple programs"
            ],
            "lastUpdated": "2025-10-09T..."
        }
    
    Returns:
        Collection: PyMongo collection object
    """
    return mongo_db["courselearningobjective"]
