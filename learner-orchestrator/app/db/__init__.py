"""Database layer: database connections and schemas only.

NO MODELS - Orchestrator only manages MongoDB preferences.
All PostgreSQL tables are managed by learner service.
"""

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

# No models imported - using only MongoDB for profiling

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
]
