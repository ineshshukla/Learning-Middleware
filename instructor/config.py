from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # Database settings
    database_url: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://lmw_user:lmw_password@localhost:5432/lmw_database"
    )
    mongodb_url: str = os.getenv(
        "MONGODB_URL",
        "mongodb://lmw_user:lmw_password@localhost:27017/?authSource=admin"
    )
    
    # JWT settings
    secret_key: str = os.getenv(
        "SECRET_KEY",
        "your-secret-key-change-this-in-production"
    )
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # API settings
    api_v1_str: str = os.getenv("API_V1_STR", "/api/v1/instructor")
    project_name: str = os.getenv(
        "PROJECT_NAME", 
        "Learning Middleware iREL - Instructor"
    )
    
    # Upload settings
    upload_dir: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()