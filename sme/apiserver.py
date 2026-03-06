
from pathlib import Path
from typing import List, Dict, Optional, Any

import sys
import os
import shutil

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from loguru import logger
from logging_config import setup_json_logging

setup_json_logging()

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
	# Optional module IDs for hybrid retrieval (n-1+1 pattern)
	ModuleID: Optional[List[str]] = None
	# Optional override for number of LOs per module (default 6)
	n_los: Optional[int] = 6


class ModuleGenerationRequest(BaseModel):
	courseID: str
	moduleID: Optional[str] = None  # Module ID for module-specific vector store retrieval
	userProfile: Dict[str, Any]  # User preferences as in sample_userpref.json
	ModuleLO: Dict[str, Dict[str, List[str]]]  # Module and Learning Objectives as in sample_lo.json


class CreateVSRequest(BaseModel):
	courseid: str


class QuizGenerationRequest(BaseModel):
	# Preferred fields
	courseID: Optional[str] = None
	module_content: Optional[str] = None  # Module content in markdown
	module_name: Optional[str] = None     # Optional module name override
	module_id: Optional[str] = None       # Optional module ID for module-specific vector store

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
	moduleid: Optional[str] = None  # Optional module ID for module-specific vector store
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
			"/course/{courseid} [DELETE]",
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
		
		# Log retrieval strategy
		if req.ModuleID and len(req.ModuleID) == len(req.ModuleName):
			logger.info(f"Using hybrid n-1+1 retrieval for {len(req.ModuleID)} modules")
		else:
			logger.warning(f"No module IDs provided or count mismatch. Using global vector store only.")
			
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Config error: {e}")

	# Generate LOs (this may call out to vllm endpoints and can be slow)
	try:
		# Extract module IDs in the same order as module names
		module_ids = None
		if req.ModuleID and len(req.ModuleID) == len(req.ModuleName):
			module_ids = req.ModuleID
			
		results = generate_los_for_modules(cfg, req.ModuleName, n_los=req.n_los, module_ids=module_ids)
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
	  "moduleID": "m1",  # Optional - for module-specific vector store
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

	# Set course id and module id in config
	try:
		if 'module_gen' not in cfg:
			raise KeyError('module_gen section missing from config')
		if 'lo_gen' not in cfg:
			raise KeyError('lo_gen section missing from config')
		cfg.lo_gen.course_id = req.courseID
		cfg.module_gen.course_id = req.courseID
		# Set module_id if provided for module-specific vector store
		cfg.module_gen.module_id = req.moduleID if hasattr(req, 'moduleID') else None
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
	moduleid: Optional[str] = Form(None),
	files: List[UploadFile] = File(...)
):
	"""Upload files for a specific course or module.
	
	Request:
	- courseid: The course ID (form field)
	- moduleid: Optional module ID (form field)
	- files: List of files to upload
	
	Files will be saved to:
	- data/docs/{courseid}/ if no moduleid
	- data/docs/{courseid}/{moduleid}/ if moduleid is provided
	"""
	if not files:
		raise HTTPException(status_code=400, detail="No files provided")
	
	# Create course-specific or module-specific directory
	root = Path(__file__).resolve().parent
	
	if moduleid:
		docs_dir = root / "data" / "docs" / courseid / moduleid
	else:
		docs_dir = root / "data" / "docs" / courseid
	
	docs_dir.mkdir(parents=True, exist_ok=True)
	
	uploaded_files = []
	
	try:
		for file in files:
			if file.filename:
				# Save file to directory
				file_path = docs_dir / file.filename
				
				with open(file_path, "wb") as buffer:
					content = await file.read()
					buffer.write(content)
				
				uploaded_files.append({
					"filename": file.filename,
					"size": len(content),
					"path": str(file_path)
				})
		
		location = f"course {courseid}, module {moduleid}" if moduleid else f"course {courseid}"
		return {
			"message": f"Successfully uploaded {len(uploaded_files)} files for {location}",
			"courseid": courseid,
			"moduleid": moduleid,
			"files": uploaded_files
		}
		
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"File upload error: {e}")


@app.post("/createvs")
def create_vector_store_api(req: CreateVSRequest):
	"""Create vector stores for a course (global + all modules).
	
	Request body:
	{
	  "courseid": "course_id_here"
	}
	
	This will create:
	- 1 global vector store from ALL files in data/docs/{courseid}/ including all module content
	- n module-specific vector stores from data/docs/{courseid}/{moduleid}/
	"""
	cfg = app.state.cfg
	
	try:
		# Import here to avoid startup issues
		from chat.rag import create_course_vector_stores
		
		# Get paths from config
		docs_path = cfg.rag.docs_path if hasattr(cfg, 'rag') and hasattr(cfg.rag, 'docs_path') else "data/docs"
		vs_path = cfg.rag.vector_store_path if hasattr(cfg, 'rag') and hasattr(cfg.rag, 'vector_store_path') else "data/vector_store"
		model = cfg.rag.embedding_model_name if hasattr(cfg, 'rag') and hasattr(cfg.rag, 'embedding_model_name') else "all-MiniLM-L6-v2"
		
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
		
		# Create all vector stores (global + modules)
		stores = create_course_vector_stores(
			docs_path=docs_path,
			vs_path=vs_path,
			model=model,
			device="cpu",
			course_id=req.courseid
		)
		
		module_ids = list(stores['modules'].keys())
		
		return {
			"message": f"Vector stores created successfully for course {req.courseid}",
			"courseid": req.courseid,
			"stores_created": {
				"global": True,
				"modules": module_ids
			},
			"total_stores": len(module_ids) + 1,
			"docs_path": str(course_docs_path),
			"vs_path": str(Path(vs_path) / req.courseid)
		}
		
	except ImportError as e:
		raise HTTPException(status_code=500, detail=f"Chat module import error: {e}")
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Vector store creation error: {e}")
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Vector store creation error: {e}")


@app.delete("/course/{courseid}")
def delete_course_data(courseid: str):
	"""Delete all data for a course: uploaded docs and vector stores.

	This removes:
	- data/docs/{courseid}/ (uploaded documents)
	- data/vector_store/{courseid}/ (FAISS indices)
	"""
	root = Path(__file__).resolve().parent
	docs_dir = root / "data" / "docs" / courseid
	vs_dir = root / "data" / "vector_store" / courseid

	deleted = {"docs": False, "vector_store": False}

	if docs_dir.is_dir():
		shutil.rmtree(docs_dir)
		deleted["docs"] = True

	if vs_dir.is_dir():
		shutil.rmtree(vs_dir)
		deleted["vector_store"] = True

	return {
		"message": f"Course data deleted for {courseid}",
		"courseid": courseid,
		"deleted": deleted
	}


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
		
		# Generate quiz using the existing workflow with optional module_id
		quiz_data = run_quiz_generation_workflow(cfg, module_data, module_id=req.module_id)
		
		return {
			"message": f"Quiz generated successfully for module: {module_name}",
			"module_name": module_name,
			"quiz_data": quiz_data,
			"content_length": len(module_content),
			"module_id": req.module_id  # Include in response for debugging
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
	  "moduleid": "m1",  # Optional - for module-specific vector store
	  "userprompt": "What are the main concepts in this course?"
	}
	
	This will use the course's vector store (global or module-specific) to provide contextual responses.
	"""
	cfg = app.state.cfg
	
	try:
		# Import here to avoid startup issues
		from chat.rag import get_vector_store, get_hybrid_retriever, format_sources
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
		model = cfg.rag.embedding_model_name if hasattr(cfg, 'rag') and hasattr(cfg.rag, 'embedding_model_name') else "all-MiniLM-L6-v2"
		
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
		
		# Get retrieval configuration - implements n-1+1 pattern by default 
		global_chunks = cfg.rag.get('global_chunks', 1) if hasattr(cfg, 'rag') else 1  # 1 global chunk for context
		module_chunks = cfg.rag.get('module_chunks', 4) if hasattr(cfg, 'rag') else 4  # n-1 module chunks
		
		# Load the appropriate retriever (hybrid or single store)
		if req.moduleid:
			# Use hybrid retrieval with n-1+1 pattern: combines module-specific + global context
			retriever = get_hybrid_retriever(
				vs_path=str(Path(root) / vs_path),
				model=model,
				device="cpu",
				course_id=req.courseid,
				module_id=req.moduleid,
				global_chunks=global_chunks,
				module_chunks=module_chunks
			)
		else:
			# Use only global vector store
			vector_store = get_vector_store(
				vs_path=str(Path(root) / vs_path),
				model=model,
				device="cpu",
				course_id=req.courseid,
				module_id=None
			)
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
		
		store_type = f"module '{req.moduleid}'" if req.moduleid else "global"
		
		return {
			"message": "Chat response generated successfully",
			"courseid": req.courseid,
			"moduleid": req.moduleid,
			"store_type": store_type,
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

