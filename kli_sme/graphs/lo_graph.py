"""LangGraph workflow for quorum-based learning objective generation.

Implements the MAS-CMD multi-agent debate pipeline for LO generation:

  Phase 0  retrieve_context      0 LLM   — vector DB lookup for the module
  Phase 1  generate_plans        3 calls — each persona decomposes intent into sub-topics
  Phase 2  cross_critique        6 calls — each plan critiqued by the other 2
  Phase 3  revise_plans          3 calls — each agent revises based on feedback
  Phase 4  decide_subtopics      1 call  — decision agent selects / merges
  Phase 5  format_objectives     1 call  — convert subtopics into KLI learning objectives

Total: ~14 LLM calls per invocation.
"""

import concurrent.futures
import json
import re
import time
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage
from langgraph.graph import END, StateGraph
from loguru import logger

from kli_sme.llm import get_llm
from kli_sme.personas import DEFAULT_PERSONAS
from kli_sme.prompts import (
    KLI_FRAMEWORK_TEXT,
    build_decision_prompt,
    build_lo_formatting_prompt,
    build_subtopic_critique_prompt,
    build_subtopic_decomposition_prompt,
    build_subtopic_revision_prompt,
)
from kli_sme.retrieval import load_retriever, retrieve_for_queries
from kli_sme.schemas import LOGenerationState


# ── helpers ──────────────────────────────────────────────────────────────────

def _invoke_llm(llm, prompt: str) -> str:
    """Call the LLM with a single user message and return the text."""
    response = llm.invoke([HumanMessage(content=prompt)])
    text = response.content or ""
    if "</think>" in text:
        text = re.split(r"</think>", text, flags=re.IGNORECASE)[-1].strip()
    return text


def _parse_subtopics_json(text: str) -> list[dict]:
    """Extract a JSON array of sub-topics from the decision agent output."""
    match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    if match:
        blob = match.group(1)
    else:
        match = re.search(r"\{[\s\S]*\"subtopics\"[\s\S]*\}", text)
        blob = match.group(0) if match else text

    data = json.loads(blob)
    return data.get("subtopics", data if isinstance(data, list) else [])


def _parse_objectives_json(text: str) -> List[Dict[str, str]]:
    """Extract learning objectives from the formatting agent output."""
    json_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    blob = json_match.group(1) if json_match else text

    try:
        data = json.loads(blob)
        items = data.get("learning_objectives", data if isinstance(data, list) else [])
        parsed: List[Dict[str, str]] = []
        for item in items:
            if isinstance(item, str):
                parsed.append({"text": item})
                continue
            if isinstance(item, dict) and item.get("text"):
                parsed.append(
                    {
                        "text": str(item.get("text", "")).strip(),
                        "knowledge_component": str(item.get("knowledge_component", "")).strip(),
                        "learning_process": str(item.get("learning_process", "")).strip(),
                        "instructional_principle": str(item.get("instructional_principle", "")).strip(),
                        "rationale": str(item.get("rationale", "")).strip(),
                    }
                )
        if parsed:
            return parsed
    except json.JSONDecodeError:
        logger.warning("LO formatting JSON parse failed, using line-based fallback")

    # line-based fallback
    fallback: List[Dict[str, str]] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        stripped = re.sub(r"^\d+[\).\s-]+", "", stripped)
        stripped = re.sub(r"^[-*]\s+", "", stripped)
        stripped = re.sub(r"^LO\d*[:.\s-]+", "", stripped, flags=re.IGNORECASE)
        if len(stripped.split()) < 4:
            continue
        fallback.append({"text": stripped})

    seen: set[str] = set()
    deduped: List[Dict[str, str]] = []
    for item in fallback:
        norm = re.sub(r"\s+", " ", item["text"]).strip().lower()
        if norm not in seen:
            seen.add(norm)
            deduped.append(item)
    return deduped


# ── node functions ───────────────────────────────────────────────────────────

def retrieve_context(state: LOGenerationState) -> Dict[str, Any]:
    """Phase 0: retrieve course context for grounding (no LLM call)."""
    course_id = state.get("course_id", "")
    module_id = state.get("module_id")
    learning_intent = state.get("learning_intent", "")
    module_name = state.get("module_name", "")
    module_description = state.get("module_description", "")
    subject_domain = state.get("subject_domain", "")

    if not course_id:
        logger.warning("No course_id — skipping vector retrieval for LO gen")
        return {"retrieved_context": ""}

    try:
        retriever = load_retriever(course_id=course_id, module_id=module_id)
        queries = [module_name, learning_intent]
        if module_description:
            queries.append(module_description)
        if subject_domain:
            queries.append(f"{subject_domain} {module_name}")
        chunks = retrieve_for_queries(retriever, queries, top_k=6)
        if chunks:
            context = "\n\n".join(chunk["text"] for chunk in chunks[:6])
            logger.info(f"[Phase 0] Retrieved {len(chunks)} context chunks for LO gen")
            return {"retrieved_context": context}
    except Exception as exc:
        logger.warning(f"Context retrieval failed for LO gen: {exc}")

    return {"retrieved_context": ""}


def generate_plans(state: LOGenerationState) -> Dict[str, Any]:
    """Phase 1: each persona independently decomposes the learning intent into sub-topics."""
    llm = get_llm(temperature=0.7, max_tokens=4096)
    personas = DEFAULT_PERSONAS
    persona_plans: dict[str, str] = {}
    discussion_log: list[str] = []

    # Build an objective-like string from the learning intent for the prompts
    objective = _build_objective_text(state)

    def _generate_plan(persona_key):
        logger.info(f"[LO Phase 1] {persona_key} generating sub-topic plan…")
        prompt = build_subtopic_decomposition_prompt(
            persona_key=persona_key,
            objective=objective,
            subject_domain=state.get("subject_domain", ""),
            grade_level=state.get("grade_level", ""),
        )
        plan = _invoke_llm(llm, prompt)
        return persona_key, plan

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(personas)) as executor:
        futures = [executor.submit(_generate_plan, pk) for pk in personas]
        for future in concurrent.futures.as_completed(futures):
            pk, plan = future.result()
            persona_plans[pk] = plan
            discussion_log.append(
                f"## {pk} — Initial Plan\n\n{plan[:600]}…\n"
            )

    return {
        "persona_plans": persona_plans,
        "discussion_log": discussion_log,
    }


def cross_critique(state: LOGenerationState) -> Dict[str, Any]:
    """Phase 2: each plan is critiqued by the other two personas."""
    llm = get_llm(temperature=0.5, max_tokens=2048)
    personas = DEFAULT_PERSONAS
    critiques: dict[str, list[str]] = {p: [] for p in personas}
    log_entries: list[str] = list(state.get("discussion_log", []))

    objective = _build_objective_text(state)

    def _critique(author, reviewer):
        logger.info(f"[LO Phase 2] {reviewer} critiques {author}…")
        prompt = build_subtopic_critique_prompt(
            reviewer_persona_key=reviewer,
            author_persona_key=author,
            plan=state["persona_plans"][author],
            objective=objective,
        )
        critique = _invoke_llm(llm, prompt)
        return author, reviewer, critique

    tasks = []
    for author in personas:
        reviewers = [p for p in personas if p != author]
        for reviewer in reviewers:
            tasks.append((author, reviewer))

    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, len(tasks))) as executor:
        futures = [executor.submit(_critique, a, r) for a, r in tasks]
        for future in concurrent.futures.as_completed(futures):
            a, r, critique = future.result()
            critiques[a].append(critique)
            log_entries.append(
                f"## {r} → critique of {a}\n\n{critique[:400]}…\n"
            )

    return {"critiques": critiques, "discussion_log": log_entries}


def revise_plans(state: LOGenerationState) -> Dict[str, Any]:
    """Phase 3: each persona revises its plan based on critiques."""
    llm = get_llm(temperature=0.6, max_tokens=4096)
    personas = DEFAULT_PERSONAS
    revised: dict[str, str] = {}
    log_entries: list[str] = list(state.get("discussion_log", []))

    objective = _build_objective_text(state)

    def _revise(persona_key):
        logger.info(f"[LO Phase 3] {persona_key} revising plan…")
        prompt = build_subtopic_revision_prompt(
            persona_key=persona_key,
            original_plan=state["persona_plans"][persona_key],
            critiques=state["critiques"][persona_key],
            objective=objective,
        )
        revised_text = _invoke_llm(llm, prompt)
        return persona_key, revised_text

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(personas)) as executor:
        futures = [executor.submit(_revise, pk) for pk in personas]
        for future in concurrent.futures.as_completed(futures):
            pk, revised_text = future.result()
            revised[pk] = revised_text
            log_entries.append(
                f"## {pk} — Revised Plan\n\n{revised_text[:600]}…\n"
            )

    return {"revised_plans": revised, "discussion_log": log_entries}


def decide_subtopics(state: LOGenerationState) -> Dict[str, Any]:
    """Phase 4: decision agent picks the best plan and outputs structured JSON."""
    llm = get_llm(temperature=0.3, max_tokens=4096)

    objective = _build_objective_text(state)

    prompt = build_decision_prompt(
        revised_plans=state["revised_plans"],
        discussion_log=state.get("discussion_log", []),
        objective=objective,
    )
    logger.info("[LO Phase 4] Decision agent selecting best decomposition…")
    raw = _invoke_llm(llm, prompt)

    try:
        subtopics = _parse_subtopics_json(raw)
    except (json.JSONDecodeError, AttributeError) as exc:
        logger.error(f"JSON parse failed, retrying once: {exc}")
        raw = _invoke_llm(llm, prompt + "\n\nIMPORTANT: output valid JSON.")
        subtopics = _parse_subtopics_json(raw)

    logger.info(f"[LO Phase 4] Decided on {len(subtopics)} sub-topics")
    return {"final_subtopics": subtopics}


def format_objectives(state: LOGenerationState) -> Dict[str, Any]:
    """Phase 5: convert decided subtopics into learning objectives by extracting the description."""
    subtopics = state.get("final_subtopics", [])
    
    logger.info(f"[LO Phase 5] Bypassing LLM format, using description from {len(subtopics)} subtopics directly…")
    
    objectives = []
    for st in subtopics:
        desc = st.get("description", "")
        # fallback to title if description is missing
        if not desc:
            desc = st.get("title", "")
        if desc:
            objectives.append({
                "text": desc,
                "knowledge_component": "",
                "learning_process": "",
                "instructional_principle": "",
                "rationale": ""
            })

    logger.info(f"[LO Phase 5] Produced {len(objectives)} learning objectives directly from subtopics")
    return {"learning_objectives": objectives}


# ── helper ───────────────────────────────────────────────────────────────────

def _build_objective_text(state: LOGenerationState) -> str:
    """Combine learning intent + module info into a single objective string
    suitable for the decomposition/critique/revision prompts."""
    parts = []
    module_name = state.get("module_name", "")
    if module_name:
        parts.append(f"Module: {module_name}")
    module_description = state.get("module_description", "")
    if module_description:
        parts.append(f"Description: {module_description}")
    parts.append(f"Learning Intent: {state.get('learning_intent', '')}")
    return "\n".join(parts)


# ── graph construction ───────────────────────────────────────────────────────

def build_lo_generation_graph() -> StateGraph:
    """Construct and compile the quorum LO generation LangGraph."""
    graph = StateGraph(LOGenerationState)

    graph.add_node("retrieve_context", retrieve_context)
    graph.add_node("generate_plans", generate_plans)
    graph.add_node("cross_critique", cross_critique)
    graph.add_node("revise_plans", revise_plans)
    graph.add_node("decide_subtopics", decide_subtopics)
    graph.add_node("format_objectives", format_objectives)

    graph.set_entry_point("retrieve_context")
    graph.add_edge("retrieve_context", "generate_plans")
    graph.add_edge("generate_plans", "cross_critique")
    graph.add_edge("cross_critique", "revise_plans")
    graph.add_edge("revise_plans", "decide_subtopics")
    graph.add_edge("decide_subtopics", "format_objectives")
    graph.add_edge("format_objectives", END)

    return graph.compile()


def run_lo_generation(
    *,
    learning_intent: str,
    module_name: str,
    course_id: str,
    module_id: str | None = None,
    module_description: str = "",
    subject_domain: str = "",
    grade_level: str = "",
    n_los: int = 6,
) -> Dict[str, Any]:
    """High-level entry point: runs the full quorum LO generation pipeline.

    Returns a dict with keys: learning_objectives, final_subtopics.
    """
    graph = build_lo_generation_graph()

    initial_state: LOGenerationState = {
        "learning_intent": learning_intent,
        "module_name": module_name,
        "module_description": module_description,
        "subject_domain": subject_domain,
        "grade_level": grade_level,
        "course_id": course_id,
        "module_id": module_id,
        "n_los": n_los,
        "retrieved_context": "",
        "persona_plans": {},
        "critiques": {},
        "revised_plans": {},
        "discussion_log": [],
        "final_subtopics": [],
        "learning_objectives": [],
    }

    t0 = time.time()
    result = graph.invoke(initial_state)
    elapsed = time.time() - t0

    objectives = result.get("learning_objectives", [])
    subtopics = result.get("final_subtopics", [])
    logger.info(
        f"Quorum LO generation complete in {elapsed:.1f}s — "
        f"{len(objectives)} objectives, {len(subtopics)} subtopics"
    )

    return {
        "learning_objectives": objectives,
        "final_subtopics": subtopics,
    }
