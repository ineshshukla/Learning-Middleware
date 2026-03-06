"""LangGraph workflow for runtime personalisation.

Takes a golden-sample module and a user profile and transforms each section
to match the learner's preferences.

  Node 1  analyze_needs          1 LLM call  — determine per-section adaptations
  Node 2  transform_sections     N LLM calls — rewrite each section
  Node 3  assemble_personalized  0 LLM       — pure-Python assembly
"""

import re
import time
from typing import Any, Dict

from langchain_core.messages import HumanMessage
from langgraph.graph import END, StateGraph
from loguru import logger

from kli_sme.llm import get_llm
from kli_sme.prompts import (
    build_needs_analysis_prompt,
    build_section_transform_prompt,
)
from kli_sme.retrieval import load_retriever, retrieve_for_queries
from kli_sme.schemas import PersonalizationState


# ── helpers ──────────────────────────────────────────────────────────────────

def _invoke_llm(llm, prompt: str) -> str:
    response = llm.invoke([HumanMessage(content=prompt)])
    text = response.content or ""
    if "</think>" in text:
        text = re.split(r"</think>", text, flags=re.IGNORECASE)[-1].strip()
    return text


def _parse_adaptation_blocks(analysis_text: str) -> Dict[str, Dict[str, str]]:
    """Parse the needs-analysis output into per-section adaptation dicts.

    Expected format per section:
        ### Section: <title>
        - **Adaptation**: ...
        - **Needs Extra Retrieval**: yes / no
        - **Extra Queries**: query1; query2
    """
    blocks: Dict[str, Dict[str, str]] = {}
    current_title = None

    for line in analysis_text.splitlines():
        stripped = line.strip()

        header_match = re.match(r"^###\s+Section:\s*(.+)", stripped)
        if header_match:
            current_title = header_match.group(1).strip()
            blocks[current_title] = {
                "adaptation": "",
                "needs_retrieval": "no",
                "extra_queries": "",
            }
            continue

        if current_title is None:
            continue

        if stripped.lower().startswith("- **adaptation**:"):
            blocks[current_title]["adaptation"] = stripped.split(":", 1)[-1].strip()
        elif stripped.lower().startswith("- **needs extra retrieval**:"):
            val = stripped.split(":", 1)[-1].strip().lower()
            blocks[current_title]["needs_retrieval"] = val
        elif stripped.lower().startswith("- **extra queries**:"):
            blocks[current_title]["extra_queries"] = stripped.split(":", 1)[-1].strip()

    return blocks


# ── node functions ───────────────────────────────────────────────────────────

def analyze_needs(state: PersonalizationState) -> Dict[str, Any]:
    """Determine what adaptations each section needs."""
    llm = get_llm(temperature=0.3, max_tokens=4096)

    # Build a compact overview of the golden sample sections
    section_titles = [
        st.get("title", "untitled") for st in state.get("subtopics", [])
    ]
    overview = "Sections:\n" + "\n".join(f"- {t}" for t in section_titles)
    overview += f"\n\n(total length: {len(state.get('golden_sample', ''))} chars)"

    prompt = build_needs_analysis_prompt(overview, state.get("user_preferences", {}))
    logger.info("[Personalize] Analyzing learner needs…")
    analysis = _invoke_llm(llm, prompt)

    return {"user_analysis": analysis}


def transform_sections(state: PersonalizationState) -> Dict[str, Any]:
    """Rewrite each golden-sample section per the adaptation instructions.

    Uses the largest output budget (8192 tokens) because this is the main
    content-rewriting step.
    """
    llm = get_llm(temperature=0.5, max_tokens=8192)
    adaptations = _parse_adaptation_blocks(state.get("user_analysis", ""))

    # Preload retriever once if any section needs extra context
    retriever = None
    course_id = state.get("course_id", "")
    if course_id and any(
        a.get("needs_retrieval", "no").startswith("yes") for a in adaptations.values()
    ):
        retriever = load_retriever(
            course_id=course_id,
            module_id=state.get("module_id"),
        )

    # Split golden sample into sections by `## ` headers
    golden = state.get("golden_sample", "")
    section_map = _split_golden_into_sections(golden)

    transformed: Dict[str, str] = {}
    for st in state.get("subtopics", []):
        title = st.get("title", "untitled")
        original = section_map.get(title, "")
        adapt = adaptations.get(title, {})
        instructions = adapt.get("adaptation", "Keep as-is.")

        extra_ctx = ""
        if adapt.get("needs_retrieval", "no").startswith("yes") and retriever:
            queries = [
                q.strip()
                for q in adapt.get("extra_queries", title).split(";")
                if q.strip()
            ]
            if queries:
                chunks = retrieve_for_queries(retriever, queries, top_k=4)
                extra_ctx = "\n\n".join(c["text"] for c in chunks)

        logger.info(f"[Personalize] Transforming section: {title}")
        prompt = build_section_transform_prompt(
            section_title=title,
            original_section=original,
            adaptation_instructions=instructions,
            extra_context=extra_ctx[:8000],
        )
        transformed[title] = _invoke_llm(llm, prompt)

    return {"transformed_sections": transformed}


def assemble_personalized(state: PersonalizationState) -> Dict[str, Any]:
    """Combine transformed sections into the final personalised module."""
    parts: list[str] = []
    for st in state.get("subtopics", []):
        title = st.get("title", "untitled")
        body = state.get("transformed_sections", {}).get(title, "")
        parts.append(f"## {title}\n\n{body}\n")

    module = "\n---\n\n".join(parts)
    logger.info(f"[Personalize] Assembled personalised module: {len(module)} chars")
    return {"personalized_module": module}


# ── helpers ──────────────────────────────────────────────────────────────────

def _split_golden_into_sections(golden: str) -> Dict[str, str]:
    """Split a golden-sample markdown into {title: body} by ``## `` headers."""
    sections: Dict[str, str] = {}
    current_title = None
    current_body: list[str] = []

    for line in golden.splitlines():
        if line.startswith("## "):
            if current_title:
                sections[current_title] = "\n".join(current_body).strip()
            current_title = line[3:].strip()
            current_body = []
        else:
            current_body.append(line)

    if current_title:
        sections[current_title] = "\n".join(current_body).strip()

    return sections


# ── graph construction ───────────────────────────────────────────────────────

def build_personalizer_graph() -> StateGraph:
    """Construct and compile the personalisation LangGraph."""
    graph = StateGraph(PersonalizationState)

    graph.add_node("analyze_needs", analyze_needs)
    graph.add_node("transform_sections", transform_sections)
    graph.add_node("assemble_personalized", assemble_personalized)

    graph.set_entry_point("analyze_needs")
    graph.add_edge("analyze_needs", "transform_sections")
    graph.add_edge("transform_sections", "assemble_personalized")
    graph.add_edge("assemble_personalized", END)

    return graph.compile()


def run_personalization(
    golden_sample: str,
    subtopics: list[dict],
    user_preferences: dict,
    course_id: str = "",
    module_id: str | None = None,
) -> dict:
    """High-level entry point: personalise a golden sample for a learner.

    Returns a dict with key ``personalized_module``.
    """
    graph = build_personalizer_graph()

    initial_state: PersonalizationState = {
        "golden_sample": golden_sample,
        "subtopics": subtopics,
        "user_preferences": user_preferences,
        "course_id": course_id,
        "module_id": module_id,
        "user_analysis": "",
        "transformed_sections": {},
        "personalized_module": "",
    }

    t0 = time.time()
    result = graph.invoke(initial_state)
    elapsed = time.time() - t0

    logger.info(f"Personalisation complete in {elapsed:.1f}s")

    return {
        "personalized_module": result["personalized_module"],
        "user_analysis": result["user_analysis"],
        "elapsed_seconds": round(elapsed, 2),
    }
