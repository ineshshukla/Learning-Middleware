"""KLI-SME service — FastAPI server and CLI entry point.

Endpoints
---------
POST /generate-golden-sample   Run the MAS-CMD golden-sample pipeline
POST /personalize-module       Personalise a golden sample for a learner
GET  /health                   Health check
"""

import argparse
import json
import time
from pathlib import Path
from typing import Any, Dict, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from omegaconf import OmegaConf
from pydantic import BaseModel
import shutil

from sme.graphs.golden_sample import run_golden_sample
from sme.graphs.personalizer import run_personalization
from sme.schemas import GoldenSampleRequest, PersonalizeRequest
from sme.retrieval import create_course_stores

app = FastAPI(title="KLI-SME Service", version="0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuizGenerationRequest(BaseModel):
    # Preferred fields
    courseID: Optional[str] = None
    module_content: Optional[str] = None
    module_name: Optional[str] = None
    module_id: Optional[str] = None

    # Backward-compat fields
    modulecontent: Optional[str] = None
    modulename: Optional[str] = None

    # Optional overrides
    questions_per_chunk: Optional[int] = None
    retrieval_top_k: Optional[int] = None
    batch_size: Optional[int] = None
    questions_per_batch: Optional[int] = None
    parallel_processing: Optional[bool] = None
    max_workers: Optional[int] = None


class ChatRequest(BaseModel):
    courseid: str
    moduleid: Optional[str] = None
    userprompt: str


@app.on_event("startup")
def startup_event():
    """Load legacy-compatible config for quiz/chat workflow modules."""
    root = Path(__file__).resolve().parent
    cfg_path = root / "conf" / "config.yaml"
    if not cfg_path.exists():
        raise RuntimeError(f"Config file not found at {cfg_path}")

    app.state.cfg = OmegaConf.load(str(cfg_path))


# ── endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "KLI-SME Service",
        "version": "0.1",
        "endpoints": [
            "/generate-golden-sample",
            "/personalize-module",
            "/generate-quiz",
            "/chat",
            "/health",
        ],
    }


@app.get("/health")
def health():
    return {"status": "healthy", "service": "sme"}


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


@app.post("/upload-file")
async def upload_file_endpoint(
    courseid: str = Form(...),
    moduleid: str | None = Form(None),
    files: list[UploadFile] = File(...),
):
    """Upload files for KLI datastore.

    Saves to:
    - sme/data/docs/{courseid}/ (course-level)
    - sme/data/docs/{courseid}/{moduleid}/ (module-level)
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    base_docs = Path(__file__).resolve().parent / "data" / "docs"
    if moduleid:
        docs_dir = base_docs / courseid / moduleid
    else:
        docs_dir = base_docs / courseid
    docs_dir.mkdir(parents=True, exist_ok=True)

    uploaded_files = []
    for file in files:
        if not file.filename:
            continue
        dest = docs_dir / file.filename
        with open(dest, "wb") as out:
            content = await file.read()
            out.write(content)
        uploaded_files.append(
            {
                "filename": file.filename,
                "size": len(content),
                "path": str(dest),
            }
        )

    return {
        "message": f"Uploaded {len(uploaded_files)} files to KLI datastore",
        "courseid": courseid,
        "moduleid": moduleid,
        "files": uploaded_files,
    }


@app.post("/createvs")
def create_vector_store_endpoint(payload: Dict[str, str]):
    """Create KLI vector store for a course.

    Expects: {"courseid": "..."}
    """
    courseid = payload.get("courseid", "").strip()
    if not courseid:
        raise HTTPException(status_code=400, detail="courseid is required")

    base = Path(__file__).resolve().parent
    docs_dir = base / "data" / "docs" / courseid
    if not docs_dir.exists():
        raise HTTPException(
            status_code=400,
            detail=f"No uploaded docs found for course {courseid}",
        )

    create_course_stores(
        course_id=courseid,
        docs_base=str(base / "data" / "docs"),
        vs_base=str(base / "data" / "vector_store"),
    )

    return {
        "message": f"KLI vector store created for course {courseid}",
        "courseid": courseid,
    }


@app.delete("/course/{courseid}")
def delete_course_data_endpoint(courseid: str):
    """Delete KLI datastore artifacts for a course."""
    base = Path(__file__).resolve().parent / "data"
    docs_dir = base / "docs" / courseid
    vs_dir = base / "vector_store" / courseid

    deleted = {"docs": False, "vector_store": False}
    if docs_dir.is_dir():
        shutil.rmtree(docs_dir)
        deleted["docs"] = True
    if vs_dir.is_dir():
        shutil.rmtree(vs_dir)
        deleted["vector_store"] = True

    return {
        "message": f"Deleted KLI datastore for course {courseid}",
        "courseid": courseid,
        "deleted": deleted,
    }


@app.post("/generate-quiz")
def generate_quiz(req: QuizGenerationRequest):
    """Generate quiz from module content using SME-compatible legacy workflow."""
    cfg = app.state.cfg

    try:
        from sme.quiz_gen.main import run_quiz_generation_workflow

        module_content = (req.module_content or "").strip() or (req.modulecontent or "").strip()
        if not module_content:
            raise HTTPException(status_code=400, detail="Module content cannot be empty")

        module_name = (req.module_name or req.modulename or "").strip()
        if not module_name:
            first_line = module_content.split("\n")[0].strip()
            module_name = first_line.lstrip("#").strip() if first_line.startswith("#") else "Generated Module"

        if "quiz_gen" not in cfg:
            raise HTTPException(status_code=500, detail="quiz_gen section missing from config")
        if req.courseID:
            cfg.quiz_gen.course_id = req.courseID
        if req.retrieval_top_k is not None:
            cfg.quiz_gen.retrieval_top_k = req.retrieval_top_k
        if req.questions_per_chunk is not None:
            cfg.quiz_gen.questions_per_chunk = req.questions_per_chunk
        if req.batch_size is not None:
            cfg.quiz_gen.batch_size = req.batch_size
        if req.questions_per_batch is not None:
            cfg.quiz_gen.questions_per_batch = req.questions_per_batch
        if req.parallel_processing is not None:
            cfg.quiz_gen.parallel_processing = req.parallel_processing
        if req.max_workers is not None:
            cfg.quiz_gen.max_workers = req.max_workers

        module_data = {
            "module_name": module_name,
            "content": module_content,
            "metadata": {
                "content_length": len(module_content),
                "generated_via_api": True,
            },
        }

        quiz_data = run_quiz_generation_workflow(cfg, module_data, module_id=req.module_id)
        return {
            "message": f"Quiz generated successfully for module: {module_name}",
            "module_name": module_name,
            "quiz_data": quiz_data,
            "content_length": len(module_content),
            "module_id": req.module_id,
        }
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f"Quiz generation module import error: {exc}")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Quiz generation error: {exc}")


@app.post("/chat")
def chat_with_course_content(req: ChatRequest):
    """Chat with course content using SME-compatible RAG workflow."""
    cfg = app.state.cfg

    try:
        from langchain_core.prompts import ChatPromptTemplate
        from langchain.chains import create_retrieval_chain
        from langchain.chains.combine_documents import create_stuff_documents_chain
        from sme.chat import vllm_client
        from sme.chat.rag import format_sources, get_hybrid_retriever, get_vector_store
        import asyncio

        if not req.userprompt.strip():
            raise HTTPException(status_code=400, detail="User prompt cannot be empty")
        if not req.courseid.strip():
            raise HTTPException(status_code=400, detail="Course ID cannot be empty")

        root = Path(__file__).resolve().parent
        docs_path = cfg.rag.docs_path if hasattr(cfg, "rag") and hasattr(cfg.rag, "docs_path") else "data/docs"
        vs_path = cfg.rag.vector_store_path if hasattr(cfg, "rag") and hasattr(cfg.rag, "vector_store_path") else "data/vector_store"
        model = cfg.rag.embedding_model_name if hasattr(cfg, "rag") and hasattr(cfg.rag, "embedding_model_name") else "all-MiniLM-L6-v2"

        course_docs_path = Path(root) / docs_path / req.courseid
        course_vs_path = Path(root) / vs_path / req.courseid
        if not course_docs_path.exists():
            raise HTTPException(status_code=400, detail=f"No documents found for course {req.courseid}. Please upload files first.")
        if not course_vs_path.exists():
            raise HTTPException(status_code=400, detail=f"No vector store found for course {req.courseid}. Please create vector store first.")

        global_chunks = cfg.rag.get("global_chunks", 1) if hasattr(cfg, "rag") else 1
        module_chunks = cfg.rag.get("module_chunks", 4) if hasattr(cfg, "rag") else 4

        if req.moduleid:
            retriever = get_hybrid_retriever(
                vs_path=str(Path(root) / vs_path),
                model=model,
                device="cpu",
                course_id=req.courseid,
                module_id=req.moduleid,
                global_chunks=global_chunks,
                module_chunks=module_chunks,
            )
        else:
            vector_store = get_vector_store(
                vs_path=str(Path(root) / vs_path),
                model=model,
                device="cpu",
                course_id=req.courseid,
                module_id=None,
            )
            retriever = vector_store.as_retriever()

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

        def llm_func(prompt_text):
            return asyncio.run(llm_func_direct(prompt_text))

        async def llm_func_direct(prompt_text):
            if isinstance(prompt_text, list) and len(prompt_text) > 0 and hasattr(prompt_text[0], "content"):
                prompt_str = "\n".join([msg.content for msg in prompt_text])
            else:
                prompt_str = str(prompt_text)
            chunks = []
            async for chunk in vllm_client.infer_4b_stream_no_think(prompt_str, max_tokens=2048, temperature=0.3):
                chunks.append(chunk)
            return "".join(chunks)

        document_chain = create_stuff_documents_chain(llm_func, prompt)
        retrieval_chain = create_retrieval_chain(retriever, document_chain)
        response = retrieval_chain.invoke({"input": req.userprompt})

        answer = response.get("answer", "[No answer returned]")
        retrieved_docs = response.get("context", [])
        sources = format_sources(retrieved_docs)

        return {
            "message": "Chat response generated successfully",
            "courseid": req.courseid,
            "moduleid": req.moduleid,
            "store_type": f"module '{req.moduleid}'" if req.moduleid else "global",
            "user_prompt": req.userprompt,
            "answer": answer,
            "sources": sources,
            "num_sources": len(retrieved_docs),
        }
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f"Chat module import error: {exc}")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat error: {exc}")


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
        uvicorn.run("sme.main:app", host=args.host, port=args.port, reload=True)

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
