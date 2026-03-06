"""End-to-end test: create a course from PDFs and generate a golden sample.

Usage (from repo root):
    python -m kli_sme.test_golden_sample

Steps:
  1. Copy Software Engineering PDFs into sme/data/docs/SE101/
  2. Build FAISS vector store for course SE101
  3. Run the golden-sample pipeline on a sample learning objective
  4. Save the output to kli_sme/output/
"""

import json
import os
import shutil
import sys
import time
from pathlib import Path

# ── paths ────────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent
SME_ROOT = REPO_ROOT / "sme"
PDF_SOURCE = REPO_ROOT / "Software Engineering"
COURSE_ID = "SE101"
DOCS_DIR = SME_ROOT / "data" / "docs" / COURSE_ID
VS_DIR = SME_ROOT / "data" / "vector_store"

# Ensure repo root is on sys.path so kli_sme is importable
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Load kli_sme's own .env (docker-compose values)
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

# Show which LLM endpoint we'll hit
print(f"VLLM URL : {os.getenv('VLLM_URL', '(not set)')}")
print(f"VLLM Model: {os.getenv('VLLM_MODEL', '(not set)')}")


# ── Step 1: copy PDFs ───────────────────────────────────────────────────────

def setup_docs():
    print("\n" + "=" * 70)
    print("Step 1: Setting up course documents")
    print("=" * 70)

    if not PDF_SOURCE.exists():
        print(f"ERROR: PDF source folder not found: {PDF_SOURCE}")
        sys.exit(1)

    pdfs = list(PDF_SOURCE.glob("*.pdf"))
    print(f"Found {len(pdfs)} PDFs in {PDF_SOURCE.name}/")
    for p in pdfs:
        print(f"  - {p.name}  ({p.stat().st_size / 1024:.0f} KB)")

    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    for pdf in pdfs:
        dest = DOCS_DIR / pdf.name
        if not dest.exists():
            shutil.copy2(pdf, dest)
            print(f"  Copied -> {dest.relative_to(REPO_ROOT)}")
        else:
            print(f"  Already exists: {dest.name}")

    print(f"Course docs ready at: {DOCS_DIR.relative_to(REPO_ROOT)}")


# ── Step 2: create vector store ──────────────────────────────────────────────

def create_vector_store():
    print("\n" + "=" * 70)
    print("Step 2: Creating FAISS vector store")
    print("=" * 70)

    vs_course_dir = VS_DIR / COURSE_ID / "global"
    if vs_course_dir.exists() and any(vs_course_dir.glob("index.faiss")):
        print(f"Vector store already exists at {vs_course_dir.relative_to(REPO_ROOT)}")
        print("  (delete it manually to force re-creation)")
        return

    from kli_sme.retrieval import create_course_stores

    print(f"Building vector store for course {COURSE_ID}...")
    t0 = time.time()
    vs = create_course_stores(
        course_id=COURSE_ID,
        docs_base=str(SME_ROOT / "data" / "docs"),
        vs_base=str(VS_DIR),
    )
    elapsed = time.time() - t0

    print(f"Done in {elapsed:.1f}s")
    print(f"  Chunks indexed: {vs.index.ntotal}")


# ── Step 3: run golden-sample pipeline ───────────────────────────────────────

SAMPLE_OBJECTIVE = (
    "Students will be able to interpret and construct UML class diagrams "
    "to represent object-oriented software designs, including classes, "
    "attributes, methods, and relationships such as association, "
    "aggregation, composition, and inheritance."
)

def run_golden_sample():
    print("\n" + "=" * 70)
    print("Step 3: Running KLI-SME golden-sample pipeline")
    print("=" * 70)
    print(f"Module : Software Engineering Modelling")
    print(f"Course : {COURSE_ID}")
    print(f"Objective: {SAMPLE_OBJECTIVE[:100]}…")
    print()

    from kli_sme.graphs.golden_sample import run_golden_sample as _run

    t0 = time.time()
    result = _run(
        objective=SAMPLE_OBJECTIVE,
        module_name="Software Engineering Modelling",
        course_id=COURSE_ID,
        module_id=None,  # use global store (PDFs are at course root)
        subject_domain="Software Engineering",
        grade_level="Undergraduate",
    )
    elapsed = time.time() - t0

    # ── save outputs ─────────────────────────────────────────────────────
    out_dir = Path(__file__).resolve().parent / "output"
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y%m%d-%H%M%S")

    md_path = out_dir / f"golden_SE101_{ts}.md"
    md_path.write_text(result["golden_sample"], encoding="utf-8")

    meta_path = out_dir / f"golden_SE101_{ts}_meta.json"
    meta_path.write_text(
        json.dumps(
            {
                "course_id": COURSE_ID,
                "module_name": "Software Engineering Modelling",
                "objective": SAMPLE_OBJECTIVE,
                "subtopics": result["final_subtopics"],
                "elapsed_seconds": result["elapsed_seconds"],
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print("=" * 70)
    print("RESULTS")
    print("=" * 70)
    print(f"Sub-topics decided: {len(result['final_subtopics'])}")
    for i, st in enumerate(result["final_subtopics"], 1):
        print(f"  {i}. {st.get('title', '?')}")
    print(f"Sections generated: {len(result['sections'])}")
    print(f"Golden sample size: {len(result['golden_sample'])} chars")
    print(f"Total time        : {elapsed:.1f}s")
    print(f"Markdown saved    : {md_path.relative_to(REPO_ROOT)}")
    print(f"Metadata saved    : {meta_path.relative_to(REPO_ROOT)}")
    print()

    # Print a preview
    preview = result["golden_sample"][:2000]
    print("-- Preview (first 2000 chars) --")
    print(preview.encode("ascii", errors="replace").decode())
    if len(result["golden_sample"]) > 2000:
        print("...(truncated)")


# ── main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    setup_docs()
    create_vector_store()
    run_golden_sample()
