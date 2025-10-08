-- Initialize PostgreSQL database with the schema for Learning Middleware

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (InstructorID) REFERENCES Instructor(InstructorID) ON DELETE CASCADE
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

-- Create ModuleFeedback table for learner-orchestrator
-- Stores feedback collected after each module completion
-- The feedback is used by SME to generate next module content
CREATE TABLE IF NOT EXISTS ModuleFeedback (
    id SERIAL PRIMARY KEY,
    learnerid VARCHAR(50) NOT NULL,
    CourseID VARCHAR(50) NOT NULL,
    ModuleID VARCHAR(50) NOT NULL,
    response_preference VARCHAR(50),  -- 'example-heavy', 'brief', 'more-analogies', 'detailed'
    confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5),
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    additional_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (learnerid) REFERENCES Learner(learnerid) ON DELETE CASCADE,
    FOREIGN KEY (CourseID) REFERENCES Course(CourseID) ON DELETE CASCADE
);

-- Create CourseDiagnostic table for initial learner assessment
-- Filled when learner enrolls in a course
CREATE TABLE IF NOT EXISTS CourseDiagnostic (
    id SERIAL PRIMARY KEY,
    learnerid VARCHAR(50) NOT NULL,
    CourseID VARCHAR(50) NOT NULL,
    preferred_generation_style VARCHAR(50) NOT NULL,  -- 'example-heavy', 'brief', 'detailed', 'more-analogies'
    current_mastery_level VARCHAR(50) NOT NULL,  -- 'beginner', 'intermediate', 'advanced'
    learning_pace VARCHAR(50),  -- 'slow', 'moderate', 'fast'
    prior_knowledge TEXT,  -- Description of what they already know
    learning_goals TEXT,  -- What they want to achieve
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (learnerid) REFERENCES Learner(learnerid) ON DELETE CASCADE,
    FOREIGN KEY (CourseID) REFERENCES Course(CourseID) ON DELETE CASCADE,
    UNIQUE(learnerid, CourseID)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_learner_email ON Learner(email);
CREATE INDEX IF NOT EXISTS idx_instructor_email ON Instructor(email);
CREATE INDEX IF NOT EXISTS idx_course_instructor ON Course(InstructorID);
CREATE INDEX IF NOT EXISTS idx_quiz_learner ON Quiz(learnerid);
CREATE INDEX IF NOT EXISTS idx_enrolled_learner ON EnrolledCourses(learnerid);
CREATE INDEX IF NOT EXISTS idx_enrolled_course ON EnrolledCourses(CourseID);
CREATE INDEX IF NOT EXISTS idx_modulefeedback_learner ON ModuleFeedback(learnerid);
CREATE INDEX IF NOT EXISTS idx_modulefeedback_course ON ModuleFeedback(CourseID);
CREATE INDEX IF NOT EXISTS idx_modulefeedback_module ON ModuleFeedback(ModuleID);
CREATE INDEX IF NOT EXISTS idx_coursediagnostic_learner ON CourseDiagnostic(learnerid);
CREATE INDEX IF NOT EXISTS idx_coursediagnostic_course ON CourseDiagnostic(CourseID);

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

CREATE TRIGGER update_learner_attribute_updated_at BEFORE UPDATE ON LearnerAttribute
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_quiz_updated_at BEFORE UPDATE ON Quiz
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_course_content_updated_at BEFORE UPDATE ON CourseContent
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_coursediagnostic_updated_at BEFORE UPDATE ON CourseDiagnostic
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE ModuleFeedback IS 'Learner feedback after completing each module. Used by SME for content generation.';
COMMENT ON COLUMN ModuleFeedback.response_preference IS 'Preferred response style: example-heavy, brief, more-analogies, detailed';
COMMENT ON COLUMN ModuleFeedback.confidence_level IS 'Self-rated confidence level: 1 (not confident) to 5 (very confident)';
COMMENT ON COLUMN ModuleFeedback.difficulty_rating IS 'Module difficulty rating: 1 (too easy) to 5 (too hard)';

COMMENT ON TABLE CourseDiagnostic IS 'Initial diagnostic assessment when learner enrolls in course. Used by SME for first module generation.';
COMMENT ON COLUMN CourseDiagnostic.preferred_generation_style IS 'How learner wants content: example-heavy, brief, detailed, more-analogies';
COMMENT ON COLUMN CourseDiagnostic.current_mastery_level IS 'Self-assessed mastery: beginner, intermediate, advanced';