"""LangGraph workflow for golden-sample module generation.

Implements the MAS-CMD style multi-agent pipeline:

  Phase 1  generate_plans      3 persona agents decompose the LO into sub-topics
  Phase 2  cross_critique      6 calls — each plan critiqued by the other 2
  Phase 3  revise_plans        3 calls — each agent revises based on feedback
  Phase 4  decide_subtopics    1 call  — decision agent selects / merges
  Phase 5  retrieve_context    0 LLM   — vector DB lookup per sub-topic
  Phase 6  generate_sections   N calls — one section per sub-topic
  Phase 7  assemble_module     0 LLM   — pure-Python assembly
"""

import json
import re
import time
from typing import Any, Dict

from langchain_core.messages import HumanMessage
from langgraph.graph import END, StateGraph
from loguru import logger

from kli_sme.llm import get_llm
from kli_sme.personas import DEFAULT_PERSONAS, TEACHER_PERSONAS
from kli_sme.prompts import (
    build_decision_prompt,
    build_section_generation_prompt,
    build_subtopic_critique_prompt,
    build_subtopic_decomposition_prompt,
    build_subtopic_revision_prompt,
)
from kli_sme.retrieval import load_retriever, retrieve_for_queries
from kli_sme.schemas import GoldenSampleState


# ── helpers ──────────────────────────────────────────────────────────────────

def _invoke_llm(llm, prompt: str) -> str:
    """Call the LLM with a single user message and return the text."""
    response = llm.invoke([HumanMessage(content=prompt)])
    text = response.content or ""
    # strip thinking tokens emitted by Qwen-style models
    if "</think>" in text:
        text = re.split(r"</think>", text, flags=re.IGNORECASE)[-1].strip()
    return text


def _parse_subtopics_json(text: str) -> list[dict]:
    """Extract a JSON array of sub-topics from the decision agent output."""
    # try to find a JSON block
    match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    if match:
        blob = match.group(1)
    else:
        # fallback: find the first { ... } that contains "subtopics"
        match = re.search(r"\{[\s\S]*\"subtopics\"[\s\S]*\}", text)
        blob = match.group(0) if match else text

    data = json.loads(blob)
    return data.get("subtopics", data if isinstance(data, list) else [])


# ── node functions ───────────────────────────────────────────────────────────

def generate_plans(state: GoldenSampleState) -> Dict[str, Any]:
    """Phase 1: each persona independently decomposes the LO into sub-topics."""
    llm = get_llm(temperature=0.7, max_tokens=4096)
    personas = DEFAULT_PERSONAS
    persona_plans: dict[str, str] = {}
    discussion_log: list[str] = []

    for persona_key in personas:
        logger.info(f"[Phase 1] {persona_key} generating sub-topic plan…")
        prompt = build_subtopic_decomposition_prompt(
            persona_key=persona_key,
            objective=state["objective"],
            subject_domain=state.get("subject_domain", ""),
            grade_level=state.get("grade_level", ""),
        )
        plan = _invoke_llm(llm, prompt)
        persona_plans[persona_key] = plan
        discussion_log.append(
            f"## {persona_key} — Initial Plan\n\n{plan[:600]}…\n"
        )

    return {
        "persona_plans": persona_plans,
        "discussion_log": discussion_log,
    }


def cross_critique(state: GoldenSampleState) -> Dict[str, Any]:
    """Phase 2: each plan is critiqued by the other two personas."""
    llm = get_llm(temperature=0.5, max_tokens=2048)
    personas = DEFAULT_PERSONAS
    critiques: dict[str, list[str]] = {p: [] for p in personas}
    log_entries: list[str] = list(state.get("discussion_log", []))

    for author in personas:
        reviewers = [p for p in personas if p != author]
        for reviewer in reviewers:
            logger.info(f"[Phase 2] {reviewer} critiques {author}…")
            prompt = build_subtopic_critique_prompt(
                reviewer_persona_key=reviewer,
                author_persona_key=author,
                plan=state["persona_plans"][author],
                objective=state["objective"],
            )
            critique = _invoke_llm(llm, prompt)
            critiques[author].append(critique)
            log_entries.append(
                f"## {reviewer} → critique of {author}\n\n{critique[:400]}…\n"
            )

    return {"critiques": critiques, "discussion_log": log_entries}


def revise_plans(state: GoldenSampleState) -> Dict[str, Any]:
    """Phase 3: each persona revises its plan based on critiques."""
    llm = get_llm(temperature=0.6, max_tokens=4096)
    personas = DEFAULT_PERSONAS
    revised: dict[str, str] = {}
    log_entries: list[str] = list(state.get("discussion_log", []))

    for persona_key in personas:
        logger.info(f"[Phase 3] {persona_key} revising plan…")
        prompt = build_subtopic_revision_prompt(
            persona_key=persona_key,
            original_plan=state["persona_plans"][persona_key],
            critiques=state["critiques"][persona_key],
            objective=state["objective"],
        )
        revised_text = _invoke_llm(llm, prompt)
        revised[persona_key] = revised_text
        log_entries.append(
            f"## {persona_key} — Revised Plan\n\n{revised_text[:600]}…\n"
        )

    return {"revised_plans": revised, "discussion_log": log_entries}


def decide_subtopics(state: GoldenSampleState) -> Dict[str, Any]:
    """Phase 4: decision agent picks the best plan and outputs structured JSON."""
    llm = get_llm(temperature=0.3, max_tokens=4096)

    prompt = build_decision_prompt(
        revised_plans=state["revised_plans"],
        discussion_log=state.get("discussion_log", []),
        objective=state["objective"],
    )
    logger.info("[Phase 4] Decision agent selecting best decomposition…")
    raw = _invoke_llm(llm, prompt)

    try:
        subtopics = _parse_subtopics_json(raw)
    except (json.JSONDecodeError, AttributeError) as exc:
        logger.error(f"JSON parse failed, retrying once: {exc}")
        raw = _invoke_llm(llm, prompt + "\n\nIMPORTANT: output valid JSON.")
        subtopics = _parse_subtopics_json(raw)

    logger.info(f"[Phase 4] Decided on {len(subtopics)} sub-topics")
    return {"final_subtopics": subtopics}


def retrieve_context(state: GoldenSampleState) -> Dict[str, Any]:
    """Phase 5: query vector DB for each sub-topic (no LLM call)."""
    course_id = state.get("course_id", "")
    module_id = state.get("module_id")

    if not course_id:
        logger.warning("No course_id — skipping vector retrieval")
        return {"retrieved_contexts": {}}

    retriever = load_retriever(course_id=course_id, module_id=module_id)
    contexts: dict[str, list[dict]] = {}

    for st in state["final_subtopics"]:
        title = st.get("title", "untitled")
        queries = st.get("search_queries", [title])
        logger.info(f"[Phase 5] Retrieving for '{title}' ({len(queries)} queries)")
        chunks = retrieve_for_queries(retriever, queries)
        contexts[title] = chunks
        logger.info(f"  → {len(chunks)} unique chunks")

    return {"retrieved_contexts": contexts}


def generate_sections(state: GoldenSampleState) -> Dict[str, Any]:
    """Phase 6: generate a module section for each sub-topic.

    This is the primary content-generation step, so it gets the largest
    output budget (8192 tokens) and the most retrieved context (12 000 chars).
    """
    llm = get_llm(temperature=0.5, max_tokens=8192)
    module_name = state.get("module_name", "Module")
    sections: dict[str, str] = {}

    for st in state["final_subtopics"]:
        title = st.get("title", "untitled")
        chunks = state.get("retrieved_contexts", {}).get(title, [])
        context_text = "\n\n".join(c["text"] for c in chunks) if chunks else "(no reference material available)"

        prompt = build_section_generation_prompt(
            subtopic_title=title,
            subtopic_description=st.get("description", ""),
            teaching_approach=st.get("teaching_approach", ""),
            retrieved_context=context_text[:12000],
            module_name=module_name,
        )
        logger.info(f"[Phase 6] Generating section: {title}")
        section_md = _invoke_llm(llm, prompt)
        sections[title] = section_md

    return {"sections": sections}


def assemble_module(state: GoldenSampleState) -> Dict[str, Any]:
    """Phase 7: concatenate sections into the final golden-sample markdown."""
    module_name = state.get("module_name", "Module")
    parts = [f"# {module_name}\n"]

    for st in state["final_subtopics"]:
        title = st.get("title", "untitled")
        body = state.get("sections", {}).get(title, "")
        parts.append(f"## {title}\n\n{body}\n")

    golden = "\n---\n\n".join(parts)
    logger.info(f"[Phase 7] Assembled golden sample: {len(golden)} chars")
    return {"golden_sample": golden}


# ── graph construction ───────────────────────────────────────────────────────

def build_golden_sample_graph() -> StateGraph:
    """Construct and compile the golden-sample LangGraph."""
    graph = StateGraph(GoldenSampleState)

    graph.add_node("generate_plans", generate_plans)
    graph.add_node("cross_critique", cross_critique)
    graph.add_node("revise_plans", revise_plans)
    graph.add_node("decide_subtopics", decide_subtopics)
    graph.add_node("retrieve_context", retrieve_context)
    graph.add_node("generate_sections", generate_sections)
    graph.add_node("assemble_module", assemble_module)

    graph.set_entry_point("generate_plans")
    graph.add_edge("generate_plans", "cross_critique")
    graph.add_edge("cross_critique", "revise_plans")
    graph.add_edge("revise_plans", "decide_subtopics")
    graph.add_edge("decide_subtopics", "retrieve_context")
    graph.add_edge("retrieve_context", "generate_sections")
    graph.add_edge("generate_sections", "assemble_module")
    graph.add_edge("assemble_module", END)

    return graph.compile()


def build_shortcut_golden_sample_graph() -> StateGraph:
    """Construct a shortened graph that skips the debate phases (1-4).

    Used when subtopics are already decided (e.g. from the LO quorum).
    Only runs: retrieve_context → generate_sections → assemble_module.
    """
    graph = StateGraph(GoldenSampleState)

    graph.add_node("retrieve_context", retrieve_context)
    graph.add_node("generate_sections", generate_sections)
    graph.add_node("assemble_module", assemble_module)

    graph.set_entry_point("retrieve_context")
    graph.add_edge("retrieve_context", "generate_sections")
    graph.add_edge("generate_sections", "assemble_module")
    graph.add_edge("assemble_module", END)

    return graph.compile()


def run_golden_sample(
    objective: str,
    module_name: str,
    course_id: str,
    module_id: str | None = None,
    subject_domain: str = "",
    grade_level: str = "",
    pre_decided_subtopics: list[dict] | None = None,
) -> dict:
    """High-level entry point: runs the golden-sample pipeline.

    If pre_decided_subtopics are provided (from the LO quorum), skips the
    debate phases (1-4) and starts directly at retrieval + section generation.

    Returns a dict with keys: golden_sample, final_subtopics, sections.
    """
    initial_state: GoldenSampleState = {
        "objective": objective,
        "module_name": module_name,
        "course_id": course_id,
        "module_id": module_id,
        "subject_domain": subject_domain,
        "grade_level": grade_level,
        "persona_plans": {},
        "critiques": {},
        "revised_plans": {},
        "discussion_log": [],
        "final_subtopics": pre_decided_subtopics or [],
        "retrieved_contexts": {},
        "sections": {},
        "golden_sample": "",
    }

    t0 = time.time()

    if pre_decided_subtopics:
        # Subtopics already decided by the LO quorum — skip debate phases
        logger.info(
            f"Using {len(pre_decided_subtopics)} pre-decided subtopics from LO quorum — "
            f"skipping debate phases"
        )
        graph = build_shortcut_golden_sample_graph()
    else:
        # Full pipeline with debate
        logger.info("Running full golden-sample pipeline with debate phases")
        graph = build_golden_sample_graph()

    result = graph.invoke(initial_state)
    elapsed = time.time() - t0

    logger.info(f"Golden sample complete in {elapsed:.1f}s")

    return {
        "golden_sample": result["golden_sample"],
        "final_subtopics": result["final_subtopics"],
        "sections": result["sections"],
        "elapsed_seconds": round(elapsed, 2),
    }
