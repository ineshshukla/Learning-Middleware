"""
SQLAlchemy ORM models for Learner Orchestrator.

This module defines database models for:
- CourseDiagnostic: Initial learner assessment
- ModuleFeedback: Post-module learner feedback

These models represent PostgreSQL tables and are used with SQLAlchemy ORM.

Usage:
    from app.db.models import CourseDiagnostic, ModuleFeedback
    from sqlalchemy.orm import Session
    
    # Create new diagnostic
    diagnostic = CourseDiagnostic(
        learnerid="uuid-123",
        courseid="CSE101",
        preferred_generation_style="example-heavy",
        current_mastery_level="beginner"
    )
    db.add(diagnostic)
    db.commit()
    
    # Query feedback
    feedback = db.query(ModuleFeedback).filter(
        ModuleFeedback.learnerid == "uuid-123"
    ).all()
"""

from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.sql import func
from app.db.database import Base


class ModuleFeedback(Base):
    """
    Learner feedback after completing each module.
    
    This feedback is sent to the SME service to:
    - Adjust difficulty of next module
    - Customize explanation style
    - Generate more relevant examples
    
    Attributes:
        id: Primary key
        learnerid: UUID of the learner
        courseid: Course identifier (e.g., "CSE101")
        moduleid: Module identifier (e.g., "CSE101_M1")
        response_preference: Preferred explanation style
            Options: 'example-heavy', 'brief', 'more-analogies', 'detailed'
        confidence_level: Self-reported confidence (1-5 scale)
            1 = Not confident, 5 = Very confident
        difficulty_rating: Perceived difficulty (1-5 scale)
            1 = Too easy, 3 = Just right, 5 = Too hard
        additional_notes: Free-form text feedback
        created_at: Timestamp when feedback was submitted
    
    Example:
        feedback = ModuleFeedback(
            learnerid="8e661b56-e937-4c31-bbe8-7bd80e678605",
            courseid="CSE101",
            moduleid="CSE101_M1",
            response_preference="example-heavy",
            confidence_level=4,
            difficulty_rating=2,
            additional_notes="Great module, want more examples!"
        )
    """
    __tablename__ = "modulefeedback"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    learnerid = Column(String(50), nullable=False)
    courseid = Column(String(50), nullable=False)
    moduleid = Column(String(50), nullable=False)
    
    # Preferences for content generation
    response_preference = Column(String(50))
    confidence_level = Column(Integer)
    difficulty_rating = Column(Integer)
    additional_notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CourseDiagnostic(Base):
    """
    Initial diagnostic assessment when learner enrolls in a course.
    
    This diagnostic helps the SME service:
    - Generate appropriate first module
    - Set initial difficulty level
    - Customize content based on prior knowledge
    
    Attributes:
        id: Primary key
        learnerid: UUID of the learner
        courseid: Course identifier (e.g., "CSE101")
        preferred_generation_style: How learner wants content presented
            Options: 'example-heavy', 'brief', 'detailed', 'more-analogies'
        current_mastery_level: Self-assessed skill level
            Options: 'beginner', 'intermediate', 'advanced'
        learning_pace: Preferred pace
            Options: 'slow', 'moderate', 'fast'
        prior_knowledge: Free text describing what learner already knows
        learning_goals: Free text describing what learner wants to achieve
        created_at: Initial submission timestamp
        updated_at: Last modification timestamp
    
    Example:
        diagnostic = CourseDiagnostic(
            learnerid="8e661b56-e937-4c31-bbe8-7bd80e678605",
            courseid="CSE101",
            preferred_generation_style="example-heavy",
            current_mastery_level="beginner",
            learning_pace="moderate",
            prior_knowledge="Basic programming in Python",
            learning_goals="Master data structures and algorithms"
        )
    """
    __tablename__ = "coursediagnostic"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    learnerid = Column(String(50), nullable=False)
    courseid = Column(String(50), nullable=False)
    
    # Initial preferences for content generation
    preferred_generation_style = Column(String(50), nullable=False)
    current_mastery_level = Column(String(50), nullable=False)
    learning_pace = Column(String(50))
    prior_knowledge = Column(Text)
    learning_goals = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# Note: Other tables (LearnerAttribute, Quiz, CourseContent, etc.) are managed
# by the Learner service. We only define models that the Orchestrator directly creates.
