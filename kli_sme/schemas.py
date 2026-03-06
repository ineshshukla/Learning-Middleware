"""Data models and LangGraph state definitions for the KLI-SME system."""

from typing import Any, Dict, List, Optional, TypedDict

from pydantic import BaseModel, Field


# ============================================================================
# Pydantic Models (API / serialization)
# ============================================================================

class SubTopic(BaseModel):
    """A single sub-topic produced by the decision agent."""

    title: str = Field(description="Short descriptive title for this sub-topic")
    description: str = Field(description="What this sub-topic covers and why")
    teaching_approach: str = Field(
        description="How to teach this sub-topic (instructional strategy)"
    )
    depth_level: str = Field(
        default="moderate",
        description="Expected depth: brief | moderate | detailed",
    )
    search_queries: List[str] = Field(
        description="Queries to run against the vector DB for this sub-topic"
    )


class SubTopicList(BaseModel):
    """Wrapper used with LangChain's JsonOutputParser."""

    subtopics: List[SubTopic]


class GoldenSampleOutput(BaseModel):
    """Serialisable result of the golden-sample pipeline."""

    module_name: str
    objective: str
    subtopics: List[SubTopic]
    sections: Dict[str, str]
    golden_sample: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GoldenSampleRequest(BaseModel):
    """API request for golden-sample generation."""

    courseID: str
    moduleID: Optional[str] = None
    module_name: str
    subject_domain: str = ""
    grade_level: str = ""
    learning_objective: str


class PersonalizeRequest(BaseModel):
    """API request for runtime personalisation."""

    courseID: str
    moduleID: Optional[str] = None
    golden_sample: str
    subtopics: List[SubTopic]
    userProfile: Dict[str, Any]


# ============================================================================
# LangGraph State TypedDicts
# ============================================================================

class GoldenSampleState(TypedDict, total=False):
    """State flowing through the golden-sample LangGraph."""

    # --- inputs (set once) ---
    objective: str
    module_name: str
    subject_domain: str
    grade_level: str
    course_id: str
    module_id: Optional[str]

    # --- Phase 1: sub-topic generation (CMD) ---
    persona_plans: Dict[str, str]
    critiques: Dict[str, List[str]]
    revised_plans: Dict[str, str]
    discussion_log: List[str]

    # --- Phase 4: decision ---
    final_subtopics: List[Dict[str, Any]]

    # --- Phase 5-7: retrieval, section gen, assembly ---
    retrieved_contexts: Dict[str, List[Dict[str, Any]]]
    sections: Dict[str, str]
    golden_sample: str


class PersonalizationState(TypedDict, total=False):
    """State flowing through the personalisation LangGraph."""

    golden_sample: str
    subtopics: List[Dict[str, Any]]
    user_preferences: Dict[str, Any]
    course_id: str
    module_id: Optional[str]

    user_analysis: str
    transformed_sections: Dict[str, str]
    personalized_module: str
