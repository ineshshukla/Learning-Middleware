"""
SQLAlchemy ORM models for Learner Orchestrator.

SIMPLIFIED PROFILING:
- NO CourseDiagnostic table (removed)
- NO ModuleFeedback table (removed)
- Profiling uses ONLY 3 MongoDB preferences:
  1. DetailLevel: "detailed" | "moderate" | "brief"
  2. ExplanationStyle: "examples-heavy" | "conceptual" | "practical" | "visual"
  3. Language: "simple" | "technical" | "balanced"

All PostgreSQL tables (Course, Learner, Quiz, etc.) are managed by the Learner Service.
Orchestrator only manages MongoDB CourseContent_Pref collection.
"""

from app.db.database import Base


# No models needed - orchestrator only manages MongoDB preferences
# All PostgreSQL tables are managed by learner service

