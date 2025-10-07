from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str = "postgresql://lmw_user:lmw_password@localhost:5432/lmw_database"
    mongodb_url: str = "mongodb://lmw_user:lmw_password@localhost:27017/lmw_mongo"
    
    # JWT settings
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # API settings
    api_v1_str: str = "/api/v1"
    project_name: str = "Learning Middleware iREL"
    
    class Config:
        env_file = ".env"


settings = Settings()