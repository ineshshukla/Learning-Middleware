-- Initialize PostgreSQL database with the schema for Learning Middleware
-- 
-- DATABASE DESIGN NOTES:
-- ======================
-- 
-- Profiling Data Collection:
-- - ONLY 3 preference fields stored in MongoDB (CourseContent_Pref collection)
--   1. DetailLevel: "detailed" | "moderate" | "brief"
--   2. ExplanationStyle: "examples-heavy" | "conceptual" | "practical" | "visual"
--   3. Language: "simple" | "technical" | "balanced"
-- - NO diagnostic forms, NO confidence/difficulty ratings, NO learning goals
-- - SME uses ONLY these 3 preferences to generate content
-- 
-- Analytics:
-- - Use OBJECTIVE metrics only: Quiz.Score, completion counts
-- - NO subjective user inputs
-- 
-- Service Architecture:
-- - ProfilingService: Manages only the 3 MongoDB preferences
-- - LearningService: Handles module/quiz flow
-- - AnalyticsService: Generates objective performance metrics

-- Create Instructor table
CREATE TABLE IF NOT EXISTS Instructor (
    InstructorID VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Course table
CREATE TABLE IF NOT EXISTS Course (
    CourseID VARCHAR(50) PRIMARY KEY,
    InstructorID VARCHAR(50) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    CourseDescription TEXT,
    TargetAudience TEXT,
    Prereqs TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (InstructorID) REFERENCES Instructor(InstructorID) ON DELETE CASCADE
);

-- Create Module table
CREATE TABLE IF NOT EXISTS Module (
    ModuleID VARCHAR(50) PRIMARY KEY,
    CourseID VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    content_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CourseID) REFERENCES Course(CourseID) ON DELETE CASCADE
);

-- Create Learner table
CREATE TABLE IF NOT EXISTS Learner (
    learnerid VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create LearnerAttribute table (matches schema.md)
CREATE TABLE IF NOT EXISTS LearnerAttribute (
    learnerid VARCHAR(50) PRIMARY KEY,
    Education TEXT,
    Interests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (learnerid) REFERENCES Learner(learnerid) ON DELETE CASCADE
);

-- Create Quiz table
CREATE TABLE IF NOT EXISTS Quiz (
    QuizID VARCHAR(50) PRIMARY KEY,
    learnerid VARCHAR(50) NOT NULL,
    ModuleID VARCHAR(50),
    Score INTEGER,
    Status VARCHAR(20) DEFAULT 'ongoing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (learnerid) REFERENCES Learner(learnerid) ON DELETE CASCADE
);

-- Create CourseContent table
CREATE TABLE IF NOT EXISTS CourseContent (
    id SERIAL PRIMARY KEY,
    CourseID VARCHAR(50) NOT NULL,
    learnerid VARCHAR(50) NOT NULL,
    CurrentModule VARCHAR(50),
    Status VARCHAR(20) DEFAULT 'ongoing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CourseID) REFERENCES Course(CourseID) ON DELETE CASCADE,
    FOREIGN KEY (learnerid) REFERENCES Learner(learnerid) ON DELETE CASCADE,
    UNIQUE(CourseID, learnerid)
);

-- Create EnrolledCourses junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS EnrolledCourses (
    id SERIAL PRIMARY KEY,
    learnerid VARCHAR(50) NOT NULL,
    CourseID VARCHAR(50) NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    FOREIGN KEY (learnerid) REFERENCES Learner(learnerid) ON DELETE CASCADE,
    FOREIGN KEY (CourseID) REFERENCES Course(CourseID) ON DELETE CASCADE,
    UNIQUE(learnerid, CourseID)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_learner_email ON Learner(email);
CREATE INDEX IF NOT EXISTS idx_instructor_email ON Instructor(email);
CREATE INDEX IF NOT EXISTS idx_course_instructor ON Course(InstructorID);
CREATE INDEX IF NOT EXISTS idx_module_course ON Module(CourseID);
CREATE INDEX IF NOT EXISTS idx_module_order ON Module(CourseID, order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_learner ON Quiz(learnerid);
CREATE INDEX IF NOT EXISTS idx_enrolled_learner ON EnrolledCourses(learnerid);
CREATE INDEX IF NOT EXISTS idx_enrolled_course ON EnrolledCourses(CourseID);

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at column
CREATE TRIGGER update_learner_updated_at BEFORE UPDATE ON Learner
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_instructor_updated_at BEFORE UPDATE ON Instructor
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_course_updated_at BEFORE UPDATE ON Course
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_module_updated_at BEFORE UPDATE ON Module
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_learner_attribute_updated_at BEFORE UPDATE ON LearnerAttribute
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_quiz_updated_at BEFORE UPDATE ON Quiz
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_course_content_updated_at BEFORE UPDATE ON CourseContent
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create GeneratedModuleContent table to store AI-generated content per learner
CREATE TABLE IF NOT EXISTS GeneratedModuleContent (
    id SERIAL PRIMARY KEY,
    moduleid VARCHAR(50) NOT NULL,
    learnerid VARCHAR(50) NOT NULL,
    courseid VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,  -- Markdown content
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (moduleid) REFERENCES Module(ModuleID) ON DELETE CASCADE,
    FOREIGN KEY (learnerid) REFERENCES Learner(learnerid) ON DELETE CASCADE,
    FOREIGN KEY (courseid) REFERENCES Course(CourseID) ON DELETE CASCADE,
    UNIQUE(moduleid, learnerid)  -- One content per module per learner
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_generated_module_content_lookup 
ON GeneratedModuleContent(moduleid, learnerid);

CREATE TRIGGER update_generated_module_content_updated_at BEFORE UPDATE ON GeneratedModuleContent
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create GeneratedQuiz table to store AI-generated quizzes per learner per module
CREATE TABLE IF NOT EXISTS GeneratedQuiz (
    id SERIAL PRIMARY KEY,
    moduleid VARCHAR(50) NOT NULL,
    learnerid VARCHAR(50) NOT NULL,
    courseid VARCHAR(50) NOT NULL,
    quiz_data JSONB NOT NULL,  -- Store entire quiz JSON structure
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (moduleid) REFERENCES Module(ModuleID) ON DELETE CASCADE,
    FOREIGN KEY (learnerid) REFERENCES Learner(learnerid) ON DELETE CASCADE,
    FOREIGN KEY (courseid) REFERENCES Course(CourseID) ON DELETE CASCADE,
    UNIQUE(moduleid, learnerid)  -- One quiz per module per learner
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_generated_quiz_lookup 
ON GeneratedQuiz(moduleid, learnerid);

CREATE TRIGGER update_generated_quiz_updated_at BEFORE UPDATE ON GeneratedQuiz
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Add comments for documentation
-- Profiling is done ONLY through MongoDB CourseContent_Pref collection with 3 fields:
-- DetailLevel: "detailed" | "moderate" | "brief"
-- ExplanationStyle: "examples-heavy" | "conceptual" | "practical" | "visual"  
-- Language: "simple" | "technical" | "balanced"