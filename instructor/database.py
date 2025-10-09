from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pymongo import MongoClient
from config import settings

# PostgreSQL database setup
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
metadata = MetaData()

# MongoDB setup
mongo_client = MongoClient(settings.mongodb_url)
mongo_db = mongo_client.get_database("lmw_mongo")


def get_db():
    """Dependency to get PostgreSQL database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_mongo_db():
    """Get MongoDB database."""
    return mongo_db