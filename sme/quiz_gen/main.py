"""Quiz Generator using OpenAI client for VLLM.

Generates structured quiz questions from the entire content of an educational module.
- Uses the openai library to connect to a VLLM server.
- Employs guided_json for reliable structured output.
- Disables 'thinking' tokens for Qwen models.
- Retrieves context from a FAISS vector store to enrich question generation.
"""
import json
import os
import time
from pathlib import Path
from typing import List, Dict, Optional, Any, TypedDict

import hydra
from loguru import logger
from dotenv import load_dotenv
from omegaconf import DictConfig

# OpenAI client for VLLM interaction
from openai import OpenAI

# LangGraph for workflow management
from langgraph.graph import StateGraph, END

# Vector store imports for RAG
try:
    from langchain_community.vectorstores import FAISS
    from langchain_huggingface import HuggingFaceEmbeddings
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logger.error("LangChain components not available. RAG features will be disabled.")

# Pydantic for structured output schema
from pydantic import BaseModel, Field
from typing import List as PydanticList

# Load environment variables
load_dotenv()

# --- VLLM Configuration ---
VLLM_BASE_URL = os.getenv('VLLM_4B_URL', 'http://localhost:8001/v1')
VLLM_MODEL = os.getenv('VLLM_4B_MODEL', 'Qwen/Qwen2-1.5B-Instruct-GGUF')
VLLM_API_KEY = os.getenv('VLLM_API_KEY', 'dummy')

# --- Project Configuration ---
PROJECT_ROOT = Path(__file__).parent.parent

# Log VLLM configuration for verification
logger.info("VLLM Configuration:")
logger.info(f"  Base URL: {VLLM_BASE_URL}")
logger.info(f"  Model: {VLLM_MODEL}")
logger.info(f"  API Key: {'***' if VLLM_API_KEY != 'dummy' else 'dummy'}")


# ============================================================================
# Pydantic Schemas for Guided JSON Output
# ============================================================================

class QuizQuestion(BaseModel):
    """A single quiz question with a structured format."""
    id: int = Field(description="A unique identifier for the question, starting from 1.")
    type: str = Field(default="mcq", description="The type of question, e.g., 'mcq'.")
    question: str = Field(description="The full text of the question.")
    options: PydanticList[str] = Field(description="A list of possible answer strings, e.g., ['A) Option 1', 'B) Option 2'].")
    correct_answer: str = Field(description="The label of the correct answer, e.g., 'A'.")
    explanation: str = Field(description="A brief explanation for why the correct answer is right.")
    topic: str = Field(description="The main topic or section from the content that this question covers.")

class QuizOutput(BaseModel):
    """The complete structure for the final quiz output."""
    questions: PydanticList[QuizQuestion] = Field(description="A list of all generated quiz questions.")

# ============================================================================
# State Management for LangGraph
# ============================================================================

class QuizState(TypedDict):
    """Defines the state that is passed between nodes in the LangGraph workflow."""
    module_name: str
    module_content: str
    generated_questions: List[Dict[str, Any]]
    final_quiz: Dict[str, Any]
    config: DictConfig
    vector_store: Optional[Any]  # Holds the FAISS vector store instance
    error: Optional[str]

# ============================================================================
# Vector Store (RAG) Functions
# ============================================================================

def load_vector_store(cfg: DictConfig) -> Optional[FAISS]:
    """Loads a FAISS vector store from a local path for context retrieval."""
    if not LANGCHAIN_AVAILABLE:
        logger.warning("LangChain components not found. Cannot load vector store.")
        return None

    vs_path = PROJECT_ROOT / cfg.rag.vector_store_path
    course_id = cfg.quiz_gen.get('course_id')
    if course_id:
        vs_path = vs_path / str(course_id)
        logger.info(f"Using course-specific vector store: {vs_path}")

    if not vs_path.exists():
        logger.warning(f"Vector store path does not exist: {vs_path}")
        return None

    try:
        embeddings = HuggingFaceEmbeddings(
            model_name=cfg.rag.embedding_model_name,
            model_kwargs={"device": "cpu"}
        )
        vector_store = FAISS.load_local(
            str(vs_path),
            embeddings,
            allow_dangerous_deserialization=True
        )
        logger.info(f"✅ Successfully loaded vector store from {vs_path}")
        return vector_store
    except Exception as e:
        logger.error(f"Failed to load vector store: {e}")
        return None

def retrieve_context_from_vector_store(vector_store: FAISS, query: str, top_k: int = 3) -> str:
    """Retrieves relevant context from the vector store based on a query."""
    if not vector_store:
        return "No vector store available."

    try:
        retriever = vector_store.as_retriever(search_kwargs={"k": top_k})
        docs = retriever.invoke(query)
        context_text = "\n\n".join(
            f"[Source {i+1} from Knowledge Base]:\n{doc.page_content}"
            for i, doc in enumerate(docs)
        )
        return context_text
    except Exception as e:
        logger.error(f"Failed to retrieve context from vector store: {e}")
        return "Failed to retrieve context."

# ============================================================================
# Content Loading
# ============================================================================

def load_module_content(content_path: str) -> Dict[str, Any]:
    """Loads module content from a markdown file."""
    content_file = Path(content_path)
    if not content_file.exists():
        raise FileNotFoundError(f"Module content file not found: {content_path}")

    content = content_file.read_text(encoding='utf-8')
    first_line = content.split('\n')[0].strip()
    module_name = first_line.lstrip('#').strip() if first_line.startswith('#') else "Unknown Module"

    logger.info(f"Loaded module: '{module_name}' ({len(content)} characters)")
    return {"module_name": module_name, "content": content}

# ============================================================================
# LangGraph Workflow Nodes
# ============================================================================

def generate_questions_node(state: QuizState) -> QuizState:
    """
    Generates quiz questions from the entire module content using the VLLM server.
    """
    logger.info("🤖 Generating quiz questions for the entire module...")
    cfg = state["config"]
    content = state["module_content"]
    vector_store = state.get("vector_store")

    try:
        # 1. Retrieve additional context from the knowledge base (RAG)
        retrieval_top_k = cfg.quiz_gen.get("retrieval_top_k", 3)
        # Use the module name as the query for broad context retrieval
        retrieved_context = retrieve_context_from_vector_store(
            vector_store, state["module_name"], top_k=retrieval_top_k
        )
        logger.info(f"Retrieved {retrieval_top_k} context documents from the knowledge base.")

        # 2. Build the prompt
        prompt = cfg.quiz_gen.quiz_generation_prompt_template.format(
            module_content=content,
            retrieved_context=retrieved_context,
            num_questions=cfg.quiz_gen.num_questions,
            num_options=cfg.quiz_gen.mcq.num_options
        )

        # 3. Initialize OpenAI client to connect to the VLLM server
        client = OpenAI(base_url=VLLM_BASE_URL, api_key=VLLM_API_KEY)

        # 4. Define extra parameters for VLLM-specific features
        extra_body = {
            # Use guided_json for structured, valid JSON output based on Pydantic schema
            "guided_json": QuizOutput.model_json_schema(),
            # Pass model-specific arguments, disabling 'thinking' for Qwen
            "chat_template_kwargs": {
                "enable_thinking": False
            },
        }

        # 5. Call the VLLM server
        logger.info("Sending request to VLLM server with guided JSON...")
        response = client.chat.completions.create(
            model=VLLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=cfg.quiz_gen.temperature,
            extra_body=extra_body,
        )

        # 6. Parse the structured response
        response_content = response.choices[0].message.content
        quiz_data = json.loads(response_content)
        generated_questions = quiz_data.get("questions", [])

        if not generated_questions:
            raise ValueError("LLM returned an empty list of questions.")

        logger.info(f"✅ Successfully generated {len(generated_questions)} questions.")
        state["generated_questions"] = generated_questions

    except Exception as e:
        logger.error(f"Error in generate_questions_node: {e}")
        state["error"] = f"Question generation failed: {e}"

    return state

def aggregate_quiz_node(state: QuizState) -> QuizState:
    """Aggregates the generated questions into the final quiz format."""
    logger.info("📋 Aggregating final quiz...")
    if state.get("error"):
        return state

    try:
        final_quiz = {
            "quiz_metadata": {
                "module_name": state["module_name"],
                "total_questions": len(state["generated_questions"]),
                "question_types": list(state["config"].quiz_gen.question_types),
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "generation_method": "langgraph_vllm_full_content",
                "generation_config": {
                    "chunking_method": "full_content",
                    "num_questions": state["config"].quiz_gen.num_questions,
                    "temperature": state["config"].quiz_gen.temperature
                }
            },
            "questions": state["generated_questions"]
        }
        state["final_quiz"] = final_quiz
        logger.info(f"Final quiz created with {len(state['generated_questions'])} questions.")
    except Exception as e:
        logger.error(f"Error in aggregate_quiz_node: {e}")
        state["error"] = f"Quiz aggregation failed: {e}"

    return state

def save_quiz_node(state: QuizState) -> QuizState:
    """Saves the final quiz to a JSON file."""
    logger.info("💾 Saving quiz to output file...")
    if state.get("error"):
        return state

    try:
        output_path_str = state["config"].quiz_gen.get("output")
        if output_path_str:
            output_path = Path(output_path_str)
        else:
            timestamp = time.strftime("%Y%m%d-%H%M%S")
            module_name_safe = state["module_name"].lower().replace(' ', '_')
            filename = f"quiz-{module_name_safe}-{timestamp}.json"
            output_dir = PROJECT_ROOT / state["config"].quiz_gen.output_dir
            output_path = output_dir / filename

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(state["final_quiz"], f, indent=2, ensure_ascii=False)

        logger.info(f"Quiz saved to: {output_path}")
        print_quiz_summary(state["final_quiz"], output_path)

    except Exception as e:
        logger.error(f"Error in save_quiz_node: {e}")
        state["error"] = f"Quiz saving failed: {e}"

    return state

def print_quiz_summary(quiz_data: Dict[str, Any], output_path: Path) -> None:
    """Prints a formatted summary of the generated quiz to the console."""
    metadata = quiz_data.get('quiz_metadata', {})
    questions = quiz_data.get('questions', [])
    summary = f"""
================================================================================
✅ Quiz Generated Successfully!
--------------------------------------------------------------------------------
  Module:          {metadata.get('module_name', 'N/A')}
  Total Questions: {len(questions)}
  Output File:     {output_path}
================================================================================
    """
    print(summary)

# ============================================================================
# LangGraph Workflow Definition
# ============================================================================

def create_quiz_workflow() -> StateGraph:
    """Creates and configures the LangGraph workflow."""
    workflow = StateGraph(QuizState)

    # Define the nodes
    workflow.add_node("generate_questions", generate_questions_node)
    workflow.add_node("aggregate_quiz", aggregate_quiz_node)
    workflow.add_node("save_quiz", save_quiz_node)

    # Define the workflow edges
    workflow.set_entry_point("generate_questions")
    workflow.add_edge("generate_questions", "aggregate_quiz")
    workflow.add_edge("aggregate_quiz", "save_quiz")
    workflow.add_edge("save_quiz", END)

    return workflow.compile()

def run_quiz_generation_workflow(cfg: DictConfig, module_data: Dict[str, Any]) -> Dict[str, Any]:
    """Initializes the state and runs the quiz generation workflow."""
    logger.info("🚀 Starting LangGraph quiz generation workflow...")

    vector_store = load_vector_store(cfg)

    initial_state = QuizState(
        module_name=module_data["module_name"],
        module_content=module_data["content"],
        generated_questions=[],
        final_quiz={},
        config=cfg,
        vector_store=vector_store,
        error=None
    )

    workflow = create_quiz_workflow()
    final_state = workflow.invoke(initial_state)

    if final_state.get("error"):
        raise Exception(final_state["error"])

    logger.info("✅ LangGraph workflow completed successfully.")
    return final_state["final_quiz"]

# ============================================================================
# Main Entry Point
# ============================================================================

@hydra.main(config_path="../conf", config_name="config", version_base=None)
def main(cfg: DictConfig) -> None:
    """Main function to orchestrate the quiz generation process."""
    logger.info("Initializing VLLM-based Quiz Generator...")

    content_path_str = cfg.quiz_gen.get('module_content_path')
    if not content_path_str:
        logger.error("Missing required argument: quiz_gen.module_content_path")
        logger.info("Example: python your_script.py quiz_gen.module_content_path=path/to/module.md")
        return

    content_path = Path(content_path_str)
    if not content_path.is_absolute():
        content_path = PROJECT_ROOT / content_path

    try:
        module_data = load_module_content(str(content_path))
        if cfg.quiz_gen.get('module_name'):
            module_data['module_name'] = cfg.quiz_gen.module_name

        run_quiz_generation_workflow(cfg, module_data)
        logger.info("🎉 Quiz generation process finished.")

    except Exception as e:
        logger.error(f"A critical error occurred: {e}", exc_info=True)
        print(f"\n❌ Error: {e}\n")

if __name__ == "__main__":
    main()