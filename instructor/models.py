from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class Instructor(Base):
    __tablename__ = "instructor"
    
    instructorid = Column(String(50), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    courses = relationship("Course", back_populates="instructor", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "course"
    
    courseid = Column(String(50), primary_key=True, index=True)
    instructorid = Column(String(50), ForeignKey("instructor.instructorid"), nullable=False)
    course_name = Column(String(255), nullable=False)
    coursedescription = Column(Text)
    targetaudience = Column(Text)
    prereqs = Column(Text)
    is_published = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    instructor = relationship("Instructor", back_populates="courses")
    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan")


class Module(Base):
    __tablename__ = "module"
    
    moduleid = Column(String(50), primary_key=True, index=True)
    courseid = Column(String(50), ForeignKey("course.courseid"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    order_index = Column(Integer, nullable=False)
    content_path = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="modules")