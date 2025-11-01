from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from database import Base


class Learner(Base):
    __tablename__ = "learner"
    
    learnerid = Column(String(50), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    enrollments = relationship("EnrolledCourse", back_populates="learner")
    course_progress = relationship("CourseContent", back_populates="learner")


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
    courses = relationship("Course", back_populates="instructor")


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
    enrollments = relationship("EnrolledCourse", back_populates="course")
    modules = relationship("Module", back_populates="course")
    course_progress = relationship("CourseContent", back_populates="course")


class Module(Base):
    __tablename__ = "module"
    
    moduleid = Column(String(50), primary_key=True, index=True)
    courseid = Column(String(50), ForeignKey("course.courseid"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    order_index = Column(Integer, nullable=False)  # For ordering modules
    content_path = Column(String(500))  # Path to module content
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="modules")


class EnrolledCourse(Base):
    __tablename__ = "enrolledcourses"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    learnerid = Column(String(50), ForeignKey("learner.learnerid"), nullable=False)
    courseid = Column(String(50), ForeignKey("course.courseid"), nullable=False)
    enrollment_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default='active')  # active, completed, dropped
    
    # Relationships
    learner = relationship("Learner", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class CourseContent(Base):
    __tablename__ = "coursecontent"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    courseid = Column(String(50), ForeignKey("course.courseid"), nullable=False)
    learnerid = Column(String(50), ForeignKey("learner.learnerid"), nullable=False)
    currentmodule = Column(String(50), ForeignKey("module.moduleid"))
    status = Column(String(20), default='ongoing')  # ongoing, completed, paused
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="course_progress")
    learner = relationship("Learner", back_populates="course_progress")


class LearnerModuleProgress(Base):
    __tablename__ = "learnermoduleprogress"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    learnerid = Column(String(50), ForeignKey("learner.learnerid"), nullable=False)
    moduleid = Column(String(50), ForeignKey("module.moduleid"), nullable=False)
    status = Column(String(20), default='not_started')  # not_started, in_progress, completed
    progress_percentage = Column(Integer, default=0)  # 0-100
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class GeneratedModuleContent(Base):
    __tablename__ = "generatedmodulecontent"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    moduleid = Column(String(50), ForeignKey("module.moduleid"), nullable=False)
    learnerid = Column(String(50), ForeignKey("learner.learnerid"), nullable=False)
    courseid = Column(String(50), ForeignKey("course.courseid"), nullable=False)
    content = Column(Text, nullable=False)  # Markdown content
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class GeneratedQuiz(Base):
    __tablename__ = "generatedquiz"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    moduleid = Column(String(50), ForeignKey("module.moduleid"), nullable=False)
    learnerid = Column(String(50), ForeignKey("learner.learnerid"), nullable=False)
    courseid = Column(String(50), ForeignKey("course.courseid"), nullable=False)
    quiz_data = Column(JSONB, nullable=False)  # Store entire quiz JSON structure
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())