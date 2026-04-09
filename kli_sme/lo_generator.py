"""KLI-grounded learning objective generation.

This module generates instructor-reviewable learning objectives from:
- the instructor's module intent
- optional module/course descriptions
- retrieved context from the shared SME vector stores
"""

import json
import re
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage
from loguru import logger

from kli_sme.llm import get_llm
from kli_sme.prompts import KLI_FRAMEWORK_TEXT
from kli_sme.retrieval import load_retriever, retrieve_for_queries


def _invoke_llm(prompt: str) -> str:
    llm = get_llm(temperature=0.4, max_tokens=4096)
    response = llm.invoke([HumanMessage(content=prompt)])
    text = response.content or ""
    if "</think>" in text:
        text = re.split(r"</think>", text, flags=re.IGNORECASE)[-1].strip()
    return text


def _parse_objectives(raw_text: str) -> List[Dict[str, str]]:
    """Parse a JSON response, with a line-based fallback for robustness."""
    json_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", raw_text)
    blob = json_match.group(1) if json_match else raw_text

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
        logger.warning("Falling back to line-based objective parsing")

    fallback: List[Dict[str, str]] = []
    for line in raw_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        stripped = re.sub(r"^\d+[\).\s-]+", "", stripped)
        stripped = re.sub(r"^[-*]\s+", "", stripped)
        stripped = re.sub(r"^LO\d*[:.\s-]+", "", stripped, flags=re.IGNORECASE)
        if len(stripped.split()) < 4:
            continue
        fallback.append({"text": stripped})

    deduped: List[Dict[str, str]] = []
    seen: set[str] = set()
    for item in fallback:
        text = item["text"]
        norm = re.sub(r"\s+", " ", text).strip().lower()
        if norm in seen:
            continue
        seen.add(norm)
        deduped.append(item)

    return deduped


def generate_learning_objectives(
    *,
    course_id: str,
    module_name: str,
    learning_intent: str,
    module_id: str | None = None,
    module_description: str = "",
    subject_domain: str = "",
    grade_level: str = "",
    n_los: int = 6,
) -> List[Dict[str, str]]:
    """Generate KLI-aligned learning objectives for a module."""
    context_chunks: List[Dict[str, Any]] = []
    retrieval_note = "No retrieved course context was available."

    if course_id:
        try:
            retriever = load_retriever(course_id=course_id, module_id=module_id)
            queries = [module_name, learning_intent]
            if module_description:
                queries.append(module_description)
            if subject_domain:
                queries.append(f"{subject_domain} {module_name}")
            context_chunks = retrieve_for_queries(retriever, queries, top_k=6)
            if context_chunks:
                retrieval_note = "\n\n".join(chunk["text"] for chunk in context_chunks[:6])
        except Exception as exc:
            logger.warning(f"Context retrieval failed for {module_name}: {exc}")

    prompt = f"""You are an expert curriculum designer creating learning objectives for an instructor workflow.

Use the KLI framework below to ensure the objectives are instructionally aligned and pedagogically strong.

{KLI_FRAMEWORK_TEXT}

Module Name: {module_name}
Module Description: {module_description or "(not provided)"}
Instructor Intent: {learning_intent}
Subject Domain: {subject_domain or "(not provided)"}
Grade Level / Audience: {grade_level or "(not provided)"}

Retrieved Course Context:
{retrieval_note[:12000]}

Task:
Generate {n_los} strong learning objectives for this module. They should:
- reflect the instructor's intended learning outcomes
- align with the retrieved course context when relevant
- be clear, measurable, and appropriate for the stated audience
- collectively cover the module without being repetitive
- explicitly reflect KLI alignment

Return valid JSON using exactly this shape:
{{
  "learning_objectives": [
    {{
      "text": "Learners will be able to ...",
      "knowledge_component": "fact | concept | principle | skill/procedure",
      "learning_process": "memory and fluency building | induction and refinement | understanding and sense-making",
      "instructional_principle": "specific instructional principle used",
      "rationale": "one short sentence explaining the KLI alignment"
    }}
  ]
}}

Rules:
- Output only JSON
- Use concrete, teachable objectives
- Avoid generic objectives like "understand the topic"
- Keep each rationale under 25 words
"""

    raw = _invoke_llm(prompt)
    objectives = _parse_objectives(raw)

    if not objectives:
        raise ValueError("KLI LO generator returned no parseable learning objectives")

    return objectives[:n_los]
