
from pathlib import Path
from typing import List, Dict, Optional

import sys
import os

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from omegaconf import OmegaConf

# Ensure the lo_gen directory is on sys.path so internal imports in lo_gen work
ROOT = Path(__file__).resolve().parent
LO_GEN_DIR = str(ROOT / "lo_gen")
if LO_GEN_DIR not in sys.path:
	sys.path.insert(0, LO_GEN_DIR)

# Import the generator function
from lo_gen.main import generate_los_for_modules


class LOSRequest(BaseModel):
	courseID: str
	ModuleName: List[str]
	# Optional override for number of LOs per module (default 6)
	n_los: Optional[int] = 6


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


# Note: health endpoint removed per user request (vllm client removed from API server)


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


if __name__ == "__main__":
	# Simple local run for development. Use uvicorn in production.
	import uvicorn

	uvicorn.run("apiserver:app", host="0.0.0.0", port=8000, reload=True)

