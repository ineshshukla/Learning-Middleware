"""
Configuration management for Learner Orchestrator Service.

This module manages all application settings using Pydantic Settings.
Configuration can be provided via:
1. Environment variables
2. .env file in the project root
3. Default values defined in Settings class

Usage:
    from app.core.config import settings
    
    # Access database URL
    db_url = settings.database_url
    
    # Access MongoDB connection
    mongo_url = settings.mongo_url
    
    # Access service URLs
    learner_api = settings.learner_service_url
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or .env file.
    
    Attributes:
        project_name: Name of the service
        service_port: Port number for the service
        db_host: PostgreSQL host
        db_port: PostgreSQL port
        db_name: PostgreSQL database name
        db_user: PostgreSQL username
        db_password: PostgreSQL password
        mongo_uri: MongoDB connection URI
        mongo_db: MongoDB database name
        learner_service_url: URL for the Learner service
        sme_service_url: URL for the SME service
    """
    
    # Application
    project_name: str = "Learner Orchestrator Service"
    service_port: int = 8001
    
    # PostgreSQL Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "lmw_database"
    db_user: str = "lmw_user"
    db_password: str = "lmw_password"
    
    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "lmw_mongo"
    
    # External Services
    learner_service_url: str = "http://localhost:8000"
    sme_service_url: str = "http://localhost:8002"
    instructor_service_url: str = "http://localhost:8002"
    
    @property
    def database_url(self) -> str:
        """
        Construct PostgreSQL connection URL.
        
        Returns:
            str: PostgreSQL connection string in format:
                 postgresql://user:password@host:port/database
        
        Example:
            >>> settings.database_url
            'postgresql://lmw_user:lmw_password@localhost:5432/lmw_database'
        """
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    @property
    def mongo_url(self) -> str:
        """
        Get MongoDB connection URL.
        
        Returns:
            str: MongoDB connection URI
        
        Example:
            >>> settings.mongo_url
            'mongodb://localhost:27017'
        """
        return self.mongo_uri
    
    @property
    def mongo_db_name(self) -> str:
        """
        Get MongoDB database name.
        
        Returns:
            str: MongoDB database name
        
        Example:
            >>> settings.mongo_db_name
            'lmw_mongo'
        """
        return self.mongo_db
    
    class Config:
        """Pydantic configuration"""
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Uses lru_cache to ensure Settings is instantiated only once.
    This is the recommended way to access settings throughout the app.
    
    Returns:
        Settings: Singleton settings instance
    
    Example:
        >>> from app.core.config import get_settings
        >>> settings = get_settings()
        >>> print(settings.project_name)
        'Learner Orchestrator Service'
    """
    return Settings()


# Global settings instance - use this in your application
settings = get_settings()
