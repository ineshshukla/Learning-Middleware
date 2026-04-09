"""KLI-SME service — FastAPI server and CLI entry point.

Endpoints
---------
POST /generate-learning-objectives  Generate KLI-aligned learning objectives
POST /generate-golden-sample        Run the MAS-CMD golden-sample pipeline
POST /personalize-module            Personalise a golden sample for a learner
GET  /health                        Health check
"""

import argparse
import json
import time
from pathlib import Path
from typing import Dict

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from kli_sme.graphs.golden_sample import run_golden_sample
from kli_sme.lo_generator import generate_learning_objectives
from kli_sme.graphs.personalizer import run_personalization
from kli_sme.schemas import (
    GenerateLearningObjectivesRequest,
    GoldenSampleRequest,
    PersonalizeRequest,
)

app = FastAPI(title="KLI-SME Service", version="0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "KLI-SME Service",
        "version": "0.1",
        "endpoints": [
            "/generate-learning-objectives",
            "/generate-golden-sample",
            "/personalize-module",
            "/health",
        ],
    }


@app.get("/health")
def health():
    return {"status": "healthy", "service": "kli_sme"}


@app.post("/generate-learning-objectives")
def generate_learning_objectives_endpoint(req: GenerateLearningObjectivesRequest):
    """Generate instructor-reviewable KLI-aligned learning objectives."""
    try:
        objectives = generate_learning_objectives(
            course_id=req.courseID,
            module_id=req.moduleID,
            module_name=req.module_name,
            module_description=req.module_description,
            learning_intent=req.learning_intent,
            subject_domain=req.subject_domain,
            grade_level=req.grade_level,
            n_los=req.n_los,
        )
        return {
            "message": "Learning objectives generated successfully",
            "module_name": req.module_name,
            "learning_objectives": objectives,
        }
    except Exception as exc:
        logger.exception("Learning objective generation failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/generate-golden-sample")
def generate_golden_sample_endpoint(req: GoldenSampleRequest):
    """Run the full MAS-CMD golden-sample pipeline.

    Returns the golden-sample markdown, sub-topics, and per-section content.
    """
    try:
        result = run_golden_sample(
            objective=req.learning_objective,
            module_name=req.module_name,
            course_id=req.courseID,
            module_id=req.moduleID,
            subject_domain=req.subject_domain,
            grade_level=req.grade_level,
        )
        return {
            "message": "Golden sample generated successfully",
            "module_name": req.module_name,
            "golden_sample": result["golden_sample"],
            "subtopics": result["final_subtopics"],
            "sections": result["sections"],
            "elapsed_seconds": result["elapsed_seconds"],
        }
    except Exception as exc:
        logger.exception("Golden sample generation failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/personalize-module")
def personalize_module_endpoint(req: PersonalizeRequest):
    """Personalise a golden-sample module for a specific learner."""
    try:
        subtopics_dicts = [st.model_dump() for st in req.subtopics]
        result = run_personalization(
            golden_sample=req.golden_sample,
            subtopics=subtopics_dicts,
            user_preferences=req.userProfile,
            course_id=req.courseID,
            module_id=req.moduleID,
        )
        return {
            "message": "Module personalised successfully",
            "personalized_module": result["personalized_module"],
            "user_analysis": result["user_analysis"],
            "elapsed_seconds": result["elapsed_seconds"],
        }
    except Exception as exc:
        logger.exception("Personalisation failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── CLI ──────────────────────────────────────────────────────────────────────

def cli():
    parser = argparse.ArgumentParser(description="KLI-SME golden-sample generator")
    sub = parser.add_subparsers(dest="command")

    # -- serve --
    serve_p = sub.add_parser("serve", help="Start the FastAPI server")
    serve_p.add_argument("--port", type=int, default=8002)
    serve_p.add_argument("--host", default="0.0.0.0")

    # -- generate --
    gen_p = sub.add_parser("generate", help="Generate a golden sample from CLI")
    gen_p.add_argument("--objective", required=True, help="Learning objective text")
    gen_p.add_argument("--module-name", required=True)
    gen_p.add_argument("--course-id", required=True)
    gen_p.add_argument("--module-id", default=None)
    gen_p.add_argument("--subject-domain", default="")
    gen_p.add_argument("--grade-level", default="")
    gen_p.add_argument("--output-dir", default="output")

    args = parser.parse_args()

    if args.command == "serve":
        uvicorn.run("kli_sme.main:app", host=args.host, port=args.port, reload=True)

    elif args.command == "generate":
        result = run_golden_sample(
            objective=args.objective,
            module_name=args.module_name,
            course_id=args.course_id,
            module_id=args.module_id,
            subject_domain=args.subject_domain,
            grade_level=args.grade_level,
        )

        out_dir = Path(args.output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        ts = time.strftime("%Y%m%d-%H%M%S")
        slug = args.module_name.lower().replace(" ", "_")

        md_path = out_dir / f"{slug}_{ts}.md"
        md_path.write_text(result["golden_sample"], encoding="utf-8")

        meta_path = out_dir / f"{slug}_{ts}_meta.json"
        meta_path.write_text(
            json.dumps(
                {
                    "module_name": args.module_name,
                    "objective": args.objective,
                    "subtopics": result["final_subtopics"],
                    "elapsed_seconds": result["elapsed_seconds"],
                },
                indent=2,
            ),
            encoding="utf-8",
        )

        print(f"Golden sample saved to {md_path}")
        print(f"Metadata saved to {meta_path}")

    else:
        parser.print_help()


if __name__ == "__main__":
    cli()
