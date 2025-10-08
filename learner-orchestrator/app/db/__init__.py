"""Database layer: models, schemas, and database connections."""

from app.db.database import (
    get_db,
    get_mongo_db,
    get_coursecontent_collection,
    get_quizcontent_collection,
    get_learnerresponse_collection,
    get_preferences_collection,
    get_library_collection,
    get_learning_objectives_collection,
    Base,
    engine,
)

from app.db.models import (
    CourseDiagnostic,
    ModuleFeedback,
)

__all__ = [
    # Database dependencies
    "get_db",
    "get_mongo_db",
    
    # MongoDB collections
    "get_coursecontent_collection",
    "get_quizcontent_collection",
    "get_learnerresponse_collection",
    "get_preferences_collection",
    "get_library_collection",
    "get_learning_objectives_collection",
    
    # SQLAlchemy
    "Base",
    "engine",
    
    # Models
    "CourseDiagnostic",
    "ModuleFeedback",
]
