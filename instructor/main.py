from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
from sqlalchemy import text
from routes import router
from config import settings
from database import engine, Base, SessionLocal

# Wait for database to be ready and create tables
def init_db():
    """Initialize database with retries."""
    max_retries = 5
    retry_interval = 5
    
    for attempt in range(max_retries):
        try:
            # Test connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"✓ Database connection successful")
            
            # Create tables
            Base.metadata.create_all(bind=engine)
            print(f"✓ Database tables created/verified")
            break
            
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"⚠ Database connection attempt {attempt + 1}/{max_retries} failed: {e}")
                print(f"  Retrying in {retry_interval} seconds...")
                time.sleep(retry_interval)
            else:
                print(f"✗ Failed to connect to database after {max_retries} attempts")
                raise

# Initialize database
init_db()

# Initialize FastAPI app
app = FastAPI(
    title="Instructor API",
    description="API for instructor operations in Learning Middleware",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router
app.include_router(router, prefix=settings.api_v1_str, tags=["instructor"])


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "Instructor API is running", "version": "1.0.0"}


@app.get("/health")
def health_check():
    """Health check endpoint."""
    try:
        # Check database connection
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 8003))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)