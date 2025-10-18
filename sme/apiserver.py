
from pathlib import Path
from typing import List, Dict, Optional, Any

import sys
import os
import shutil

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
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
	# Preferred fields
	courseID: Optional[str] = None
	module_content: Optional[str] = None  # Module content in markdown
	module_name: Optional[str] = None     # Optional module name override

	# Backward-compat fields (legacy)
	modulecontent: Optional[str] = None
	modulename: Optional[str] = None

	# Optional overrides
	questions_per_chunk: Optional[int] = None
	retrieval_top_k: Optional[int] = None
	# Batching and performance overrides
	batch_size: Optional[int] = None
	questions_per_batch: Optional[int] = None
	parallel_processing: Optional[bool] = None
	max_workers: Optional[int] = None


class ChatRequest(BaseModel):
	courseid: str
	userprompt: str


app = FastAPI(title="LO Generator API", version="0.1")

# Add CORS middleware to allow requests from Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)


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
			"/chat",
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
	"""Generate quiz from module content using knowledge base context.

	Accepts both new and legacy request shapes. Supports batching parameters.
	"""
	cfg = app.state.cfg
	
	try:
		# Import here to avoid startup issues
		from quiz_gen.main import run_quiz_generation_workflow
		# Resolve module content (support both new and legacy fields)
		module_content = (req.module_content or "").strip() or (req.modulecontent or "").strip()
		if not module_content:
			raise HTTPException(status_code=400, detail="Module content cannot be empty")

		# Resolve module name (optional). If missing, infer from first header
		module_name = (req.module_name or req.modulename or "").strip()
		if not module_name:
			first_line = module_content.split('\n')[0].strip()
			if first_line.startswith('#'):
				module_name = first_line.lstrip('#').strip()
			else:
				module_name = "Generated Module"

		# Set quiz_gen configuration overrides
		if 'quiz_gen' not in cfg:
			raise HTTPException(status_code=500, detail='quiz_gen section missing from config')
		# Course ID for vector store selection
		if req.courseID:
			cfg.quiz_gen.course_id = req.courseID
		# Retrieval depth
		if req.retrieval_top_k is not None:
			cfg.quiz_gen.retrieval_top_k = req.retrieval_top_k
		# Legacy per-chunk questions (used in sequential path / metadata)
		if req.questions_per_chunk is not None:
			cfg.quiz_gen.questions_per_chunk = req.questions_per_chunk
		# Batching and performance
		if req.batch_size is not None:
			cfg.quiz_gen.batch_size = req.batch_size
		if req.questions_per_batch is not None:
			cfg.quiz_gen.questions_per_batch = req.questions_per_batch
		if req.parallel_processing is not None:
			cfg.quiz_gen.parallel_processing = req.parallel_processing
		if req.max_workers is not None:
			cfg.quiz_gen.max_workers = req.max_workers

		# Prepare module data structure expected by quiz generator
		module_data = {
			"module_name": module_name,
			"content": module_content,
			"metadata": {
				"content_length": len(module_content),
				"generated_via_api": True
			}
		}
		
		# Generate quiz using the existing workflow
		quiz_data = run_quiz_generation_workflow(cfg, module_data)
		
		return {
			"message": f"Quiz generated successfully for module: {module_name}",
			"module_name": module_name,
			"quiz_data": quiz_data,
			"content_length": len(module_content)
		}
		
	except ImportError as e:
		raise HTTPException(status_code=500, detail=f"Quiz generation module import error: {e}")
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Quiz generation error: {e}")


@app.post("/chat")
def chat_with_course_content(req: ChatRequest):
	"""Chat with course content using RAG.
	
	Request body:
	{
	  "courseid": "COURSE_123",
	  "userprompt": "What are the main concepts in this course?"
	}
	
	This will use the course's vector store to provide contextual responses.
	"""
	cfg = app.state.cfg
	
	try:
		# Import here to avoid startup issues
		from chat.main import create_vector_store
		from chat.rag import format_sources
		from langchain_core.prompts import ChatPromptTemplate
		from langchain.chains.combine_documents import create_stuff_documents_chain
		from langchain.chains import create_retrieval_chain
		import asyncio
		
		if not req.userprompt.strip():
			raise HTTPException(status_code=400, detail="User prompt cannot be empty")
		
		if not req.courseid.strip():
			raise HTTPException(status_code=400, detail="Course ID cannot be empty")
		
		# Check if course documents and vector store exist
		root = Path(__file__).resolve().parent
		docs_path = cfg.rag.docs_path if hasattr(cfg, 'rag') and hasattr(cfg.rag, 'docs_path') else "data/docs"
		vs_path = cfg.rag.vector_store_path if hasattr(cfg, 'rag') and hasattr(cfg.rag, 'vector_store_path') else "data/vector_store"
		
		course_docs_path = Path(root) / docs_path / req.courseid
		course_vs_path = Path(root) / vs_path / req.courseid
		
		if not course_docs_path.exists():
			raise HTTPException(
				status_code=400, 
				detail=f"No documents found for course {req.courseid}. Please upload files first."
			)
		
		if not course_vs_path.exists():
			raise HTTPException(
				status_code=400, 
				detail=f"No vector store found for course {req.courseid}. Please create vector store first."
			)
		
		# Update config with course ID
		if not hasattr(cfg, 'rag'):
			cfg.rag = {}
		cfg.rag.course_id = req.courseid
		
		# Create/load vector store for the course
		vector_store = create_vector_store(cfg)
		
		# Create retriever
		retriever = vector_store.as_retriever()
		
		# Setup prompt template optimized for concise responses without excessive thinking
		chat_prompt_template = """You are a helpful assistant that provides direct, concise answers based on course content.

Instructions:
- Answer directly without much thinking
- Use the provided context to answer accurately
- If the context doesn't contain the information, say so briefly
- Do not overthink or provide excessive detail unless specifically requested

Context:
{context}

Question: {input}

Answer:"""
		
		prompt = ChatPromptTemplate.from_template(chat_prompt_template)
		
		# Import vllm client for fast responses
		from chat import vllm_client
		
		def llm_func(prompt_text):
			"""Wrapper function to call LLM with reduced thinking."""
			return asyncio.run(llm_func_direct(prompt_text))

		async def llm_func_direct(prompt_text):
			"""Call LLM with settings to reduce excessive thinking."""
			# Extract content from message objects if needed
			if isinstance(prompt_text, list) and len(prompt_text) > 0 and hasattr(prompt_text[0], 'content'):
				prompt_str = "\n".join([msg.content for msg in prompt_text])
			else:
				prompt_str = str(prompt_text)
			
			# Use the no-think streaming function for more focused responses
			chunks = []
			async for chunk in vllm_client.infer_4b_stream_no_think(
				prompt_str, 
				max_tokens=2048,  # Limit response length
				temperature=0.3   # Lower temperature for more focused responses
			):
				chunks.append(chunk)
			return ''.join(chunks)

		# Create retrieval chain
		document_chain = create_stuff_documents_chain(llm_func, prompt)
		retrieval_chain = create_retrieval_chain(retriever, document_chain)
		
		# Get response from retrieval chain
		response = retrieval_chain.invoke({"input": req.userprompt})
		answer = response.get("answer", "[No answer returned]")
		
		# Get source information
		retrieved_docs = response.get('context', [])
		sources = format_sources(retrieved_docs)
		
		return {
			"message": "Chat response generated successfully",
			"courseid": req.courseid,
			"user_prompt": req.userprompt,
			"answer": answer,
			"sources": sources,
			"num_sources": len(retrieved_docs)
		}
		
	except ImportError as e:
		raise HTTPException(status_code=500, detail=f"Chat module import error: {e}")
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Chat error: {e}")


if __name__ == "__main__":
	# Simple local run for development. Use uvicorn in production.
	import uvicorn
	import os

	port = int(os.getenv("PORT", 8000))
	uvicorn.run("apiserver:app", host="0.0.0.0", port=port, reload=True)

