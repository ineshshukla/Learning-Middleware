from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router
from config import settings
from database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.project_name,
    openapi_url=f"{settings.api_v1_str}/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix=f"{settings.api_v1_str}/auth", tags=["authentication"])

@app.get("/")
def root():
    return {"message": "Learning Middleware iREL - Learner Authentication API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)