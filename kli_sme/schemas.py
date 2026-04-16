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
    pre_decided_subtopics: Optional[List[Dict[str, Any]]] = None


class LearningObjectiveCandidate(BaseModel):
    """A single KLI-aligned learning objective proposal."""

    text: str
    knowledge_component: str = ""
    learning_process: str = ""
    instructional_principle: str = ""
    rationale: str = ""


class GenerateLearningObjectivesRequest(BaseModel):
    """API request for KLI-based learning objective generation."""

    courseID: str
    moduleID: Optional[str] = None
    module_name: str
    module_description: str = ""
    learning_intent: str
    subject_domain: str = ""
    grade_level: str = ""
    n_los: int = 6


class GenerateLearningObjectivesResponse(BaseModel):
    """API response for KLI-based learning objective generation."""

    module_name: str
    learning_objectives: List[LearningObjectiveCandidate]


class PersonalizeRequest(BaseModel):
    """API request for runtime personalisation."""

    courseID: str
    moduleID: Optional[str] = None
    golden_sample: str
    subtopics: List[SubTopic]
    userProfile: Dict[str, Any]


class QuizQuestion(BaseModel):
    """A single quiz question generated for the module."""
    id: int = Field(description="A unique identifier for the question, starting from 1.")
    type: str = Field(default="mcq", description="The type of question, e.g., 'mcq'.")
    question: str = Field(description="The full clear text of the question.")
    options: List[str] = Field(description="List of strings, e.g., ['A) Option 1', 'B) Option 2'].")
    correct_answer: str = Field(description="The label of the correct answer, e.g., 'A'.")
    explanation: str = Field(description="A brief explanation for why the correct answer is right.")
    topic: str = Field(description="The main topic or section from the content that this question covers.")


class QuizOutput(BaseModel):
    """The complete structured result containing all questions."""
    questions: List[QuizQuestion] = Field(description="List of all strictly typed generated quiz questions.")


class GenerateQuizRequest(BaseModel):
    """API request for generating module assessments."""
    module_content: str
    module_name: str
    courseID: str
    module_id: Optional[str] = None
    num_questions: int = 5



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


class LOGenerationState(TypedDict, total=False):
    """State flowing through the quorum-based LO generation LangGraph.

    Phases 1-4 mirror the golden-sample MAS-CMD debate (personas propose
    subtopics, cross-critique, revise, then a decision agent selects).
    Phase 5 converts the decided subtopics into KLI-aligned learning
    objectives.
    """

    # --- inputs (set once) ---
    learning_intent: str
    module_name: str
    module_description: str
    subject_domain: str
    grade_level: str
    course_id: str
    module_id: Optional[str]
    n_los: int

    # --- retrieval ---
    retrieved_context: str

    # --- Phase 1-3: MAS-CMD debate ---
    persona_plans: Dict[str, str]
    critiques: Dict[str, List[str]]
    revised_plans: Dict[str, str]
    discussion_log: List[str]

    # --- Phase 4: decision ---
    final_subtopics: List[Dict[str, Any]]

    # --- Phase 5: LO formatting ---
    learning_objectives: List[Dict[str, str]]


class QuizState(TypedDict, total=False):
    """State flowing through the KLI quiz generator LangGraph."""

    # --- inputs ---
    module_content: str
    module_name: str
    course_id: str
    module_id: Optional[str]
    num_questions: int

    # --- retrieval ---
    retrieved_context: str

    # --- generation ---
    generated_questions: List[Dict[str, Any]]
    final_quiz: Dict[str, Any]
