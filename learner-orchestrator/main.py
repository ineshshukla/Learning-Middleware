"""
Simplified Learner Orchestrator - Main Application
Focus: Module → Quiz → Feedback flow
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.db.database import Base, engine
from app.core.config import settings
from routes import router

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.project_name,
    description="Orchestrates learner flow: modules → quizzes → feedback",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router, prefix="/api/orchestrator", tags=["orchestrator"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Learner Orchestrator",
        "version": "2.0.0",
        "description": "Simplified orchestrator for module→quiz→feedback flow",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
