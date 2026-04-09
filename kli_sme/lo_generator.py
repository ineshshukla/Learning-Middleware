"""KLI-grounded learning objective generation.

Uses a quorum-based multi-agent pipeline (MAS-CMD) where three pedagogical
personas debate the best subtopic decomposition of the instructor's learning
intent, then a decision agent selects the consensus subtopics, and finally
the subtopics are converted into KLI-aligned learning objectives.

Pipeline phases (14 LLM calls):
  Phase 0  retrieve_context      0 LLM   — vector DB lookup
  Phase 1  generate_plans        3 calls — 3 personas decompose intent
  Phase 2  cross_critique        6 calls — each plan critiqued by the other 2
  Phase 3  revise_plans          3 calls — each agent revises based on feedback
  Phase 4  decide_subtopics      1 call  — decision agent selects / merges
  Phase 5  format_objectives     1 call  — subtopics → KLI learning objectives
"""

from typing import Any, Dict, List

from loguru import logger

from kli_sme.graphs.lo_graph import run_lo_generation


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
) -> Dict[str, Any]:
    """Generate KLI-aligned learning objectives for a module.

    Delegates to the quorum-based LangGraph pipeline which runs the full
    MAS-CMD debate before producing objectives.

    Returns a dict with:
      - learning_objectives: List[Dict]  (the KLI-aligned LOs)
      - final_subtopics: List[Dict]      (the quorum-decided subtopics)
    """
    logger.info(
        f"Starting quorum LO generation for '{module_name}' "
        f"(course={course_id}, n_los={n_los})"
    )

    result = run_lo_generation(
        learning_intent=learning_intent,
        module_name=module_name,
        course_id=course_id,
        module_id=module_id,
        module_description=module_description,
        subject_domain=subject_domain,
        grade_level=grade_level,
        n_los=n_los,
    )

    objectives = result.get("learning_objectives", [])
    subtopics = result.get("final_subtopics", [])

    if not objectives:
        raise ValueError("Quorum LO pipeline returned no parseable learning objectives")

    return {
        "learning_objectives": objectives,
        "final_subtopics": subtopics,
    }
