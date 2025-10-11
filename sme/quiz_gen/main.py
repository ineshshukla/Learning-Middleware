"""Quiz Generator with LangGraph Agent.

Generates structured quiz questions from educational module content using:
- LangGraph workflow for content chunking and processing
- MarkdownHeaderTextSplitter for section-based chunking
- ChatOpenAI integration with VLLM server for question generation
"""
import json
import os
import re
import time
from pathlib import Path
from typing import List, Dict, Optional, Any, TypedDict
from dataclasses import dataclass

import hydra
from omegaconf import DictConfig
from loguru import logger
from dotenv import load_dotenv

# LangGraph and LangChain imports
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain.text_splitter import MarkdownHeaderTextSplitter

# Load environment variables
load_dotenv()

# VLLM Configuration from environment
VLLM_BASE_URL = os.getenv('VLLM_4B_URL', 'http://localhost:8001/v1')
VLLM_MODEL = os.getenv('VLLM_4B_MODEL', './Qwen3-4B-Thinking-2507-Q4_K_M.gguf')
VLLM_API_KEY = os.getenv('VLLM_API_KEY', 'dummy')

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent

# Log VLLM configuration
logger.info(f"VLLM Configuration:")
logger.info(f"  Base URL: {VLLM_BASE_URL}")
logger.info(f"  Model: {VLLM_MODEL}")
logger.info(f"  API Key: {'***' if VLLM_API_KEY != 'dummy' else 'dummy'}")


# ============================================================================
# State Management
# ============================================================================

class QuizState(TypedDict):
    """State for the quiz generation workflow."""
    module_name: str
    module_content: str
    content_chunks: List[str]
    generated_questions: List[Dict[str, Any]]
    final_quiz: Dict[str, Any]
    config: DictConfig
    error: Optional[str]


@dataclass
class ContentChunk:
    """Container for content chunk with metadata."""
    text: str
    index: int
    start_char: int
    end_char: int


# ============================================================================
# Content Processing Functions
# ============================================================================

def load_module_content(content_path: str) -> Dict[str, Any]:
    """Load module content from markdown file.
    
    Args:
        content_path: Path to the module markdown file
        
    Returns:
        Dictionary containing module content and metadata
        
    Raises:
        FileNotFoundError if file doesn't exist
        Exception if content processing fails
    """
    content_file = Path(content_path)
    
    if not content_file.exists():
        raise FileNotFoundError(f"Module content file not found: {content_path}")
    
    # Read the markdown content
    with open(content_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract module name from first header
    module_name = "Unknown Module"
    first_line = content.split('\n')[0].strip()
    if first_line.startswith('#'):
        module_name = first_line.lstrip('#').strip()
    
    logger.info(f"Loaded module: {module_name}")
    logger.info(f"Content length: {len(content)} characters")
    
    return {
        "module_name": module_name,
        "content": content,
        "metadata": {
            "content_length": len(content),
            "loaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }
    }


# ============================================================================
# LangGraph Workflow Nodes
# ============================================================================

def chunk_content_node(state: QuizState) -> QuizState:
    """Split module content into chunks based on level 2 headers (##).
    
    Args:
        state: Current workflow state
        
    Returns:
        Updated state with content chunks
    """
    logger.info("📝 Chunking module content by ## headers...")
    
    try:
        cfg = state["config"]
        content = state["module_content"]
        
        # Define headers to split on - focusing on level 2 headers
        headers_to_split_on = [
            ("#", "Header 1"),
            ("##", "Header 2"),
        ]
        
        # Initialize MarkdownHeaderTextSplitter
        text_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=headers_to_split_on,
            strip_headers=False  # Keep headers in the chunks for context
        )
        
        # Split content into documents
        split_docs = text_splitter.split_text(content)
        
        # Extract text content from documents and filter meaningful chunks
        chunks = []
        for doc in split_docs:
            chunk_text = doc.page_content.strip()
            
            # Only include chunks that are substantial enough and contain level 2 headers
            if len(chunk_text) > 200 and "##" in chunk_text:
                chunks.append(chunk_text)
        
        # If no level 2 chunks found, fall back to splitting by any headers
        if not chunks:
            logger.warning("No level 2 headers found, falling back to all headers")
            for doc in split_docs:
                chunk_text = doc.page_content.strip()
                if len(chunk_text) > 100:
                    chunks.append(chunk_text)
        
        logger.info(f"Created {len(chunks)} content chunks from markdown headers")
        for i, chunk in enumerate(chunks):
            header_match = re.search(r'^##\s+(.+)$', chunk, re.MULTILINE)
            header_title = header_match.group(1) if header_match else "Unknown"
            logger.debug(f"Chunk {i+1}: {header_title} ({len(chunk)} chars)")
        
        state["content_chunks"] = chunks
        return state
        
    except Exception as e:
        logger.error(f"Error in chunk_content_node: {e}")
        state["error"] = f"Content chunking failed: {e}"
        return state


def generate_questions_node(state: QuizState) -> QuizState:
    """Generate quiz questions for each chunk using ChatOpenAI with VLLM.
    
    Args:
        state: Current workflow state
        
    Returns:
        Updated state with generated questions
    """
    logger.info("🤖 Generating quiz questions...")
    
    try:
        cfg = state["config"]
        chunks = state["content_chunks"]
        
        # Initialize ChatOpenAI to connect to VLLM server using env variables
        llm = ChatOpenAI(
            base_url=VLLM_BASE_URL,  # From .env VLLM_4B_URL
            api_key=VLLM_API_KEY,   # From .env VLLM_API_KEY
            model=VLLM_MODEL,       # From .env VLLM_4B_MODEL
            temperature=cfg.quiz_gen.temperature
        )
        
        all_questions = []
        
        for i, chunk in enumerate(chunks):
            logger.debug(f"Generating questions for chunk {i+1}/{len(chunks)}")
            
            # Build prompt - no additional context needed
            prompt = cfg.quiz_gen.quiz_generation_prompt_template.format(
                content_chunk=chunk,
                questions_per_chunk=cfg.quiz_gen.questions_per_chunk,
                num_options=cfg.quiz_gen.mcq.num_options
            )
            
            # Generate questions using ChatOpenAI
            messages = [HumanMessage(content=prompt)]
            response = llm.invoke(messages)
            
            # Parse response
            response_text = response.content.strip()
            
            # Clean response - remove thinking tokens if present
            if '</think>' in response_text.lower():
                parts = re.split(r'</think>', response_text, flags=re.IGNORECASE)
                response_text = parts[-1].strip()
            
            # Extract JSON
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                try:
                    questions_data = json.loads(json_match.group(0))
                    chunk_questions = questions_data.get("questions", [])
                    
                    # Add metadata to each question
                    for j, question in enumerate(chunk_questions):
                        question["id"] = len(all_questions) + j + 1
                        question["type"] = "mcq"
                        question["chunk_index"] = i
                    
                    all_questions.extend(chunk_questions)
                    logger.debug(f"Generated {len(chunk_questions)} questions for chunk {i+1}")
                    
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse JSON for chunk {i+1}: {e}")
                    continue
            else:
                logger.warning(f"No JSON found in response for chunk {i+1}")
                continue
        
        logger.info(f"Generated {len(all_questions)} total questions")
        
        state["generated_questions"] = all_questions
        return state
        
    except Exception as e:
        logger.error(f"Error in generate_questions_node: {e}")
        state["error"] = f"Question generation failed: {e}"
        return state


def aggregate_quiz_node(state: QuizState) -> QuizState:
    """Aggregate generated questions into final quiz format.
    
    Args:
        state: Current workflow state
        
    Returns:
        Updated state with final quiz
    """
    logger.info("📋 Aggregating final quiz...")
    
    try:
        cfg = state["config"]
        questions = state["generated_questions"]
        module_name = state["module_name"]
        
        # Use all generated questions without capping
        selected_questions = questions
        logger.info(f"Using all {len(selected_questions)} generated questions")
        
        # Renumber questions
        for i, question in enumerate(selected_questions):
            question["id"] = i + 1
        
        # Create final quiz structure
        final_quiz = {
            "quiz_metadata": {
                "module_name": module_name,
                "total_questions": len(selected_questions),
                "question_types": list(cfg.quiz_gen.question_types),
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "generation_method": "langgraph_agent",
                "chunks_processed": len(state["content_chunks"]),
                "generation_config": {
                    "chunking_method": "markdown_headers",
                    "questions_per_chunk": cfg.quiz_gen.questions_per_chunk,
                    "temperature": cfg.quiz_gen.temperature
                }
            },
            "questions": selected_questions
        }
        
        state["final_quiz"] = final_quiz
        logger.info(f"✅ Final quiz created with {len(selected_questions)} questions")
        
        return state
        
    except Exception as e:
        logger.error(f"Error in aggregate_quiz_node: {e}")
        state["error"] = f"Quiz aggregation failed: {e}"
        return state


def save_quiz_node(state: QuizState) -> QuizState:
    """Save the final quiz to output file.
    
    Args:
        state: Current workflow state
        
    Returns:
        Updated state
    """
    logger.info("💾 Saving quiz to output file...")
    
    try:
        cfg = state["config"]
        quiz_data = state["final_quiz"]
        
        # Determine output path
        if hasattr(cfg.quiz_gen, 'output') and cfg.quiz_gen.output:
            output_path = Path(cfg.quiz_gen.output)
        else:
            # Default output location
            timestamp = time.strftime("%Y%m%d-%H%M%S")
            module_name = state["module_name"]
            filename = f"quiz-{module_name.lower().replace(' ', '_')}-{timestamp}.json"
            output_dir = PROJECT_ROOT / cfg.quiz_gen.output_dir
            output_path = output_dir / filename
        
        # Ensure parent directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save quiz data
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(quiz_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"💾 Saved quiz to: {output_path}")
        
        # Print summary
        print_quiz_summary(quiz_data, output_path)
        
        return state
        
    except Exception as e:
        logger.error(f"Error in save_quiz_node: {e}")
        state["error"] = f"Quiz saving failed: {e}"
        return state




def print_quiz_summary(quiz_data: Dict[str, Any], output_path: Path) -> None:
    """Print a summary of the generated quiz.
    
    Args:
        quiz_data: Generated quiz data
        output_path: Path where quiz was saved
    """
    metadata = quiz_data.get('quiz_metadata', {})
    questions = quiz_data.get('questions', [])
    
    print(f"\n{'='*80}")
    print(f"✅ Quiz generated successfully!")
    print(f"{'='*80}")
    print(f"Module: {metadata.get('module_name', 'Unknown')}")
    print(f"Questions: {len(questions)}")
    print(f"Generation method: {metadata.get('generation_method', 'unknown')}")
    print(f"Chunks processed: {metadata.get('chunks_processed', 'N/A')}")
    
    # Count question types
    type_counts = {}
    for q in questions:
        q_type = q.get('type', 'unknown')
        type_counts[q_type] = type_counts.get(q_type, 0) + 1
    
    print(f"Question types: {dict(type_counts)}")
    print(f"Output file: {output_path}")
    print(f"{'='*80}\n")
    
    # Show first question as preview
    if questions:
        print("📝 Sample Question:")
        first_q = questions[0]
        print(f"Q{first_q.get('id', 1)}: {first_q.get('question', '')}")
        
        if first_q.get('type') == 'mcq' and 'options' in first_q:
            for option in first_q['options'][:3]:  # Show first 3 options
                print(f"  {option}")
            if len(first_q['options']) > 3:
                print(f"  ... and {len(first_q['options']) - 3} more options")
        
        print(f"Correct: {first_q.get('correct_answer', 'N/A')}")
        print("-" * 80)


# ============================================================================
# LangGraph Workflow Setup
# ============================================================================

def create_quiz_workflow() -> StateGraph:
    """Create the LangGraph workflow for quiz generation.
    
    Returns:
        Configured StateGraph workflow
    """
    workflow = StateGraph(QuizState)
    
    # Add nodes
    workflow.add_node("chunk_content", chunk_content_node)
    workflow.add_node("generate_questions", generate_questions_node)
    workflow.add_node("aggregate_quiz", aggregate_quiz_node)
    workflow.add_node("save_quiz", save_quiz_node)
    
    # Define the workflow edges
    workflow.set_entry_point("chunk_content")
    workflow.add_edge("chunk_content", "generate_questions")
    workflow.add_edge("generate_questions", "aggregate_quiz")
    workflow.add_edge("aggregate_quiz", "save_quiz")
    workflow.add_edge("save_quiz", END)
    
    return workflow.compile()


def run_quiz_generation_workflow(cfg: DictConfig, module_data: Dict[str, Any]) -> Dict[str, Any]:
    """Run the complete quiz generation workflow.
    
    Args:
        cfg: Hydra configuration
        module_data: Module content and metadata
        
    Returns:
        Final quiz data
        
    Raises:
        Exception if workflow fails
    """
    logger.info("🚀 Starting LangGraph quiz generation workflow...")
    
    # Create workflow
    workflow = create_quiz_workflow()
    
    # Initialize state
    initial_state = QuizState(
        module_name=module_data["module_name"],
        module_content=module_data["content"],
        content_chunks=[],
        generated_questions=[],
        final_quiz={},
        config=cfg,
        error=None
    )
    
    # Run workflow
    try:
        final_state = workflow.invoke(initial_state)
        
        # Check for errors
        if final_state.get("error"):
            raise Exception(final_state["error"])
        
        logger.info("✅ LangGraph workflow completed successfully")
        return final_state["final_quiz"]
        
    except Exception as e:
        logger.error(f"Workflow execution failed: {e}")
        raise


# ============================================================================
# Main Entry Point
# ============================================================================

@hydra.main(config_path="../conf", config_name="config", version_base=None)
def main(cfg: DictConfig) -> None:
    """Main entry point for quiz generation.
    
    Expected command line args:
    - quiz_gen.module_content_path: Path to module markdown file (required)
    - quiz_gen.module_name: Module name override (optional)
    - quiz_gen.output: Custom output path (optional)
    - quiz_gen.num_questions: Number of questions override (optional)
    - quiz_gen.question_types: Question types override (optional)
    """
    logger.info("Initializing LangGraph Quiz Generator")
    
    # Get module content path
    content_path = getattr(cfg.quiz_gen, 'module_content_path', None)
    if not content_path:
        logger.error("Please specify module content path with quiz_gen.module_content_path='path/to/module.md'")
        return
    
    # Handle relative paths
    if not Path(content_path).is_absolute():
        content_path = PROJECT_ROOT / content_path
    
    try:
        # Load module content
        logger.info(f"Loading module content from: {content_path}")
        module_data = load_module_content(content_path)
        
        # Override module name if provided
        if hasattr(cfg.quiz_gen, 'module_name') and cfg.quiz_gen.module_name:
            module_data['module_name'] = cfg.quiz_gen.module_name
        
        # Run LangGraph workflow
        logger.info("=" * 80)
        quiz_data = run_quiz_generation_workflow(cfg, module_data)
        logger.info("=" * 80)
        
        logger.info("🎉 Quiz generation completed successfully!")
        
    except Exception as e:
        logger.error(f"Quiz generation failed: {e}")
        print(f"\n❌ Error: {e}\n")
        return


if __name__ == "__main__":
    main()