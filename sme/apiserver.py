
from pathlib import Path
from typing import List, Dict, Optional, Any

import sys
import os
import shutil

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from omegaconf import OmegaConf

# Ensure the lo_gen, module_gen, chat, and quiz_gen directories are on sys.path so internal imports work
ROOT = Path(__file__).resolve().parent
LO_GEN_DIR = str(ROOT / "lo_gen")
MODULE_GEN_DIR = str(ROOT / "module_gen")
CHAT_DIR = str(ROOT / "chat")
QUIZ_GEN_DIR = str(ROOT / "quiz_gen")
if LO_GEN_DIR not in sys.path:
	sys.path.insert(0, LO_GEN_DIR)
if MODULE_GEN_DIR not in sys.path:
	sys.path.insert(0, MODULE_GEN_DIR)
if CHAT_DIR not in sys.path:
	sys.path.insert(0, CHAT_DIR)
if QUIZ_GEN_DIR not in sys.path:
	sys.path.insert(0, QUIZ_GEN_DIR)

# Import the generator functions
from lo_gen.main import generate_los_for_modules
from module_gen.main import generate_module_content


class LOSRequest(BaseModel):
	courseID: str
	ModuleName: List[str]
	# Optional override for number of LOs per module (default 6)
	n_los: Optional[int] = 6


class ModuleGenerationRequest(BaseModel):
	courseID: str
	userProfile: Dict[str, Any]  # User preferences as in sample_userpref.json
	ModuleLO: Dict[str, Dict[str, List[str]]]  # Module and Learning Objectives as in sample_lo.json


class CreateVSRequest(BaseModel):
	courseid: str


class QuizGenerationRequest(BaseModel):
	modulecontent: str
	modulename: str


app = FastAPI(title="LO Generator API", version="0.1")


@app.on_event("startup")
def startup_event():
	"""Load configuration on startup and store on app state."""
	root = Path(__file__).resolve().parent
	cfg_path = root / "conf" / "config.yaml"
	if not cfg_path.exists():
		raise RuntimeError(f"Config file not found at {cfg_path}")

	cfg = OmegaConf.load(str(cfg_path))
	# Keep config on the app for handlers to use
	app.state.cfg = cfg


@app.get("/")
def root():
	"""Root endpoint - API info."""
	return {
		"name": "SME Service - Learning Objectives Generator API",
		"version": "0.1",
		"status": "running",
		"endpoints": [
			"/generate-los",
			"/generate-module",
			"/generate-quiz",
			"/upload-file",
			"/createvs",
			"/health",
			"/docs"
		]
	}


@app.get("/health")
def health_check():
	"""Health check endpoint for Docker and monitoring."""
	return {
		"status": "healthy",
		"service": "sme",
		"version": "0.1"
	}


@app.post("/generate-los")
def generate_los(req: LOSRequest):
	"""Generate learning objectives for a list of modules.

	Request body:
	{
	  "courseID": "<course id>",
	  "ModuleName": ["Module 1", "Module 2"],
	  "n_los": 6  # optional
	}

	Response: JSON object mapping each module name to a list of learning objectives.
	{
	  "Module 1": ["LO1", "LO2", ...],
	  "Module 2": [...]
	}
	"""
	if not req.ModuleName:
		raise HTTPException(status_code=400, detail="ModuleName list cannot be empty")

	cfg = app.state.cfg

	# Set course id in config so generator uses course-specific docs/vector store
	try:
		# Ensure lo_gen exists in cfg
		if 'lo_gen' not in cfg:
			raise KeyError('lo_gen section missing from config')
		cfg.lo_gen.course_id = req.courseID
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Config error: {e}")

	# Generate LOs (this may call out to vllm endpoints and can be slow)
	try:
		results = generate_los_for_modules(cfg, req.ModuleName, n_los=req.n_los)
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Generation error: {e}")

	# Build response mapping module -> list of objectives
	response: Dict[str, List[str]] = {}
	for m, data in results.items():
		los = data.get('learning_objectives') if isinstance(data, dict) else None
		response[m] = los or []

	return response


@app.post("/generate-module")
def generate_module(req: ModuleGenerationRequest):
	"""Generate module content based on learning objectives and user preferences.

	Request body:
	{
	  "courseID": "egrf",
	  "userProfile": {
	    "_id": {"CourseID": "CSE101", "LearnerID": "L123"},
	    "preferences": {
	      "DetailLevel": "detailed",
	      "ExplanationStyle": "conceptual", 
	      "Language": "technical"
	    },
	    "lastUpdated": "2025-10-04T10:30:00Z"
	  },
	  "ModuleLO": {
	    "Understanding Processor Architecture": {
	      "learning_objectives": [
	        "Understand the fundamental components...",
	        "Analyze the control unit's role..."
	      ]
	    }
	  }
	}

	Response: JSON object mapping module name to markdown content.
	{
	  "ModuleName": "# Module Title\n\n## Content in markdown format..."
	}
	"""
	if not req.ModuleLO:
		raise HTTPException(status_code=400, detail="ModuleLO cannot be empty")

	cfg = app.state.cfg

	# Set course id in config
	try:
		if 'module_gen' not in cfg:
			raise KeyError('module_gen section missing from config')
		if 'lo_gen' not in cfg:
			raise KeyError('lo_gen section missing from config')
		cfg.lo_gen.course_id = req.courseID
		cfg.module_gen.course_id = req.courseID
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Config error: {e}")

	# Generate module content for each module
	try:
		response_data = {}
		
		for module_name, module_data in req.ModuleLO.items():
			learning_objectives = module_data.get('learning_objectives', [])
			
			if not learning_objectives:
				raise ValueError(f"No learning objectives found for module '{module_name}'")
			
			# Generate content for this module
			result = generate_module_content(
				cfg=cfg,
				module_name=module_name,
				learning_objectives=learning_objectives,
				user_preferences=req.userProfile
			)
			
			# Extract the clean markdown content (without think tokens)
			markdown_content = result.get('markdown_content', '')
			response_data[module_name] = markdown_content
		
		return response_data
		
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Module generation error: {e}")


@app.post("/upload-file")
async def upload_file(
	courseid: str = Form(...),
	files: List[UploadFile] = File(...)
):
	"""Upload files for a specific course.
	
	Request:
	- courseid: The course ID (form field)
	- files: List of files to upload
	
	Files will be saved to data/docs/{courseid}/ directory.
	"""
	if not files:
		raise HTTPException(status_code=400, detail="No files provided")
	
	# Create course-specific directory
	root = Path(__file__).resolve().parent
	course_docs_dir = root / "data" / "docs" / courseid
	course_docs_dir.mkdir(parents=True, exist_ok=True)
	
	uploaded_files = []
	
	try:
		for file in files:
			if file.filename:
				# Save file to course directory
				file_path = course_docs_dir / file.filename
				
				with open(file_path, "wb") as buffer:
					content = await file.read()
					buffer.write(content)
				
				uploaded_files.append({
					"filename": file.filename,
					"size": len(content),
					"path": str(file_path)
				})
			
		return {
			"message": f"Successfully uploaded {len(uploaded_files)} files for course {courseid}",
			"courseid": courseid,
			"files": uploaded_files
		}
		
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"File upload error: {e}")


@app.post("/createvs")
def create_vector_store_api(req: CreateVSRequest):
	"""Create vector store for a course.
	
	Request body:
	{
	  "courseid": "course_id_here"
	}
	
	This will create a vector store from files already uploaded to data/docs/{courseid}/
	"""
	cfg = app.state.cfg
	
	try:
		# Import here to avoid startup issues
		from chat.main import create_vector_store
		
		# Get paths from config
		docs_path = cfg.rag.docs_path if hasattr(cfg, 'rag') and hasattr(cfg.rag, 'docs_path') else "data/docs"
		vs_path = cfg.rag.vector_store_path if hasattr(cfg, 'rag') and hasattr(cfg.rag, 'vector_store_path') else "data/vector_store"
		
		# Make paths absolute
		root = Path(__file__).resolve().parent
		docs_path = str(root / docs_path)
		vs_path = str(root / vs_path)
		
		# Check if course documents exist
		course_docs_path = Path(docs_path) / req.courseid
		if not course_docs_path.exists() or not any(course_docs_path.iterdir()):
			raise HTTPException(
				status_code=400, 
				detail=f"No documents found for course {req.courseid}. Please upload files first."
			)
		
		# Update config with course ID
		if not hasattr(cfg, 'rag'):
			cfg.rag = {}
		cfg.rag.course_id = req.courseid
		
		# Create vector store using the existing function
		vs = create_vector_store(cfg)
		
		return {
			"message": f"Vector store created successfully for course {req.courseid}",
			"courseid": req.courseid,
			"docs_path": str(course_docs_path),
			"vs_path": str(Path(vs_path) / req.courseid)
		}
		
	except ImportError as e:
		raise HTTPException(status_code=500, detail=f"Chat module import error: {e}")
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Vector store creation error: {e}")


@app.post("/generate-quiz")
def generate_quiz(req: QuizGenerationRequest):
	"""Generate quiz from module content.
	
	Request body:
	{
	  "modulecontent": "Module content in markdown format...",
	  "modulename": "Understanding Processor Architecture"
	}
	
	This will generate quiz questions from the provided module content.
	"""
	cfg = app.state.cfg
	
	try:
		# Import here to avoid startup issues
		from quiz_gen.main import run_quiz_generation_workflow
		
		if not req.modulecontent.strip():
			raise HTTPException(status_code=400, detail="Module content cannot be empty")
		
		if not req.modulename.strip():
			raise HTTPException(status_code=400, detail="Module name cannot be empty")
		
		# Prepare module data structure expected by quiz generator
		module_data = {
			"module_name": req.modulename,
			"content": req.modulecontent,
			"metadata": {
				"content_length": len(req.modulecontent),
				"generated_via_api": True
			}
		}
		
		# Generate quiz using the existing workflow
		quiz_data = run_quiz_generation_workflow(cfg, module_data)
		
		return {
			"message": f"Quiz generated successfully for module: {req.modulename}",
			"module_name": req.modulename,
			"quiz_data": quiz_data,
			"content_length": len(req.modulecontent)
		}
		
	except ImportError as e:
		raise HTTPException(status_code=500, detail=f"Quiz generation module import error: {e}")
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Quiz generation error: {e}")


if __name__ == "__main__":
	# Simple local run for development. Use uvicorn in production.
	import uvicorn
	import os

	port = int(os.getenv("PORT", 8000))
	uvicorn.run("apiserver:app", host="0.0.0.0", port=port, reload=True)

