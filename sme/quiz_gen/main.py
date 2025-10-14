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

# Parallel processing
import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import partial

# Vector store imports
try:
    from langchain_community.vectorstores import FAISS
    from langchain_huggingface import HuggingFaceEmbeddings
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logger.error("LangChain components not available. Please install required packages.")

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
    vector_store: Optional[Any]  # FAISS vector store instance
    error: Optional[str]


@dataclass
class ContentChunk:
    """Container for content chunk with metadata."""
    text: str
    index: int
    start_char: int
    end_char: int


# ============================================================================
# Vector Store Functions
# ============================================================================

def load_vector_store(cfg: DictConfig):
    """Load LangChain FAISS vector store for knowledge base retrieval.
    
    Args:
        cfg: Hydra configuration
        
    Returns:
        FAISS vector store or None if failed
    """
    if not LANGCHAIN_AVAILABLE:
        logger.error("LangChain not available. Cannot load vector store.")
        return None
    
    # Use the same vector store path as module_gen
    vs_path = PROJECT_ROOT / cfg.rag.vector_store_path
    
    # If course_id is provided, use course-specific vector store path
    course_id = cfg.quiz_gen.get('course_id', None)
    if course_id:
        vs_path = vs_path / course_id
        logger.info(f"Using course-specific vector store path: {vs_path}")
    
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
        logger.info(f"Successfully loaded vector store from {vs_path}")
        return vector_store
    except Exception as e:
        logger.error(f"Failed to load vector store: {e}")
        return None


def retrieve_context_from_vector_store(vector_store, query: str, top_k: int = 3) -> List[Dict]:
    """Retrieve relevant context chunks from vector store.
    
    Args:
        vector_store: FAISS vector store instance
        query: Search query (content chunk text)
        top_k: Number of chunks to retrieve
        
    Returns:
        List of document chunks with metadata
    """
    if vector_store is None:
        return []
    
    try:
        retriever = vector_store.as_retriever(search_kwargs={"k": top_k})
        docs = retriever.invoke(query)
        
        results = []
        for i, doc in enumerate(docs):
            results.append({
                "title": doc.metadata.get("filename", doc.metadata.get("source", f"doc-{i}")),
                "text": doc.page_content[:2000],  # Limit context size
                "source_id": i,
                "metadata": doc.metadata
            })
        return results
    except Exception as e:
        logger.error(f"Failed to retrieve from vector store: {e}")
        return []


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


def _process_chunk_batch(chunk_batch_data: tuple, cfg: DictConfig, vector_store, 
                        vllm_base_url: str, vllm_api_key: str, vllm_model: str) -> tuple:
    """Process a batch of chunks to generate questions (for parallel execution).
    
    Generates configurable number of questions per batch of chunks to reduce LLM calls.
    
    Args:
        chunk_batch_data: Tuple of (batch_index, list_of_chunk_tuples)
                         where each chunk_tuple is (chunk_index, chunk_text)
        cfg: Hydra configuration
        vector_store: FAISS vector store instance
        vllm_base_url: VLLM server URL
        vllm_api_key: VLLM API key
        vllm_model: VLLM model name
        
    Returns:
        Tuple of (batch_index, generated_questions_list)
    """
    batch_idx, chunk_list = chunk_batch_data
    retrieval_top_k = cfg.quiz_gen.get("retrieval_top_k", 3)
    questions_per_batch = cfg.quiz_gen.get("questions_per_batch", 3)
    
    # Combine chunks in the batch
    combined_chunks = []
    chunk_indices = []
    for i, chunk in chunk_list:
        combined_chunks.append(chunk)
        chunk_indices.append(i)
    
    combined_content = "\n\n---\n\n".join(combined_chunks)
    
    # Initialize LLM for this thread
    llm = ChatOpenAI(
        base_url=vllm_base_url,
        api_key=vllm_api_key,
        model=vllm_model,
        temperature=cfg.quiz_gen.temperature
    )
    
    # Retrieve relevant context from knowledge base for all chunks in batch
    retrieved_contexts = []
    if vector_store is not None:
        for i, chunk in chunk_list:
            # Extract section title for better retrieval
            header_match = re.search(r'^##\s+(.+)$', chunk, re.MULTILINE)
            query = header_match.group(1) if header_match else chunk[:200]
            
            context_chunks = retrieve_context_from_vector_store(
                vector_store, 
                query, 
                top_k=retrieval_top_k
            )
            
            if context_chunks:
                context_text = "\n".join([
                    f"[Source {idx+1}]: {ctx['text'][:800]}"
                    for idx, ctx in enumerate(context_chunks)
                ])
                retrieved_contexts.append(context_text)
    
    retrieved_context = "\n\n".join(retrieved_contexts) if retrieved_contexts else "No additional context available."
    
    # Calculate total questions for this batch (configurable via questions_per_batch)
    num_questions = questions_per_batch
    
    # Build prompt with combined chunks and retrieved context
    prompt = cfg.quiz_gen.quiz_generation_prompt_template.format(
        content_chunk=combined_content,
        retrieved_context=retrieved_context,
        questions_per_chunk=num_questions,
        num_options=cfg.quiz_gen.mcq.num_options
    )
    
    # Generate questions using ChatOpenAI
    try:
        messages = [HumanMessage(content=prompt)]
        response = llm.invoke(messages)
        response_text = response.content.strip()
        
        # Clean response - remove thinking tokens if present
        if '</think>' in response_text.lower():
            parts = re.split(r'</think>', response_text, flags=re.IGNORECASE)
            response_text = parts[-1].strip()
        
        # Extract JSON
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            questions_data = json.loads(json_match.group(0))
            batch_questions = questions_data.get("questions", [])
            
            # Add metadata to each question
            # Distribute questions across chunks in the batch
            for idx, question in enumerate(batch_questions):
                question["type"] = "mcq"
                # Assign to chunk based on question position
                question["chunk_index"] = chunk_indices[idx % len(chunk_indices)]
            
            chunk_desc = f"Batch {batch_idx+1} (chunks {chunk_indices[0]+1}-{chunk_indices[-1]+1})"
            logger.debug(f"✓ {chunk_desc}: Generated {len(batch_questions)} questions")
            return (batch_idx, batch_questions)
        else:
            logger.warning(f"✗ Batch {batch_idx+1}: No JSON found in response")
            return (batch_idx, [])
            
    except Exception as e:
        logger.warning(f"✗ Batch {batch_idx+1}: Error - {e}")
        return (batch_idx, [])


def generate_questions_node(state: QuizState) -> QuizState:
    """Generate quiz questions for each chunk using ChatOpenAI with VLLM and knowledge base context.
    
    Uses parallel processing to speed up generation when multiple chunks are present.
    
    Args:
        state: Current workflow state
        
    Returns:
        Updated state with generated questions
    """
    logger.info("🤖 Generating quiz questions with knowledge base context...")
    
    try:
        cfg = state["config"]
        chunks = state["content_chunks"]
        vector_store = state.get("vector_store")
        
        # Check if parallel processing is enabled (default: True for multiple chunks)
        use_parallel = cfg.quiz_gen.get("parallel_processing", True) and len(chunks) > 1
        max_workers = cfg.quiz_gen.get("max_workers", min(4, len(chunks)))  # Default: 4 workers
        batch_size = cfg.quiz_gen.get("batch_size", 2)
        questions_per_batch = cfg.quiz_gen.get("questions_per_batch", 3)
        
        if use_parallel:
            logger.info(f"⚡ Using parallel processing with {max_workers} workers for {len(chunks)} chunks")
            logger.info(f"⚡ Batching: {questions_per_batch} questions per {batch_size} chunks to reduce LLM calls")
            
            # Prepare chunk data - batch chunks together based on batch_size
            chunk_data = list(enumerate(chunks))
            chunk_batches = []
            for i in range(0, len(chunk_data), batch_size):
                batch = chunk_data[i:i+batch_size]  # Take batch_size chunks at a time
                chunk_batches.append((i//batch_size, batch))  # (batch_index, list_of_chunks)
            
            logger.info(f"⚡ Created {len(chunk_batches)} batches from {len(chunks)} chunks")
            
            # Process chunk batches in parallel
            all_questions = []
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Create partial function with fixed parameters
                process_func = partial(
                    _process_chunk_batch,
                    cfg=cfg,
                    vector_store=vector_store,
                    vllm_base_url=VLLM_BASE_URL,
                    vllm_api_key=VLLM_API_KEY,
                    vllm_model=VLLM_MODEL
                )
                
                # Submit all tasks
                future_to_batch = {executor.submit(process_func, batch): batch for batch in chunk_batches}
                
                # Collect results as they complete
                results = []
                for future in as_completed(future_to_batch):
                    try:
                        batch_idx, questions = future.result()
                        results.append((batch_idx, questions))
                    except Exception as e:
                        batch_data_item = future_to_batch[future]
                        logger.error(f"Batch {batch_data_item[0]+1} generated exception: {e}")
                
                # Sort by batch index and flatten questions
                results.sort(key=lambda x: x[0])
                question_id = 1
                for _, batch_questions in results:
                    for question in batch_questions:
                        question["id"] = question_id
                        question_id += 1
                    all_questions.extend(batch_questions)
            
            logger.info(f"✅ Parallel generation completed: {len(all_questions)} total questions from {len(chunk_batches)} batches")
        
        else:
            # Sequential processing (original method)
            logger.info(f"Processing {len(chunks)} chunks sequentially...")
            
            # Initialize ChatOpenAI to connect to VLLM server using env variables
            llm = ChatOpenAI(
                base_url=VLLM_BASE_URL,
                api_key=VLLM_API_KEY,
                model=VLLM_MODEL,
                temperature=cfg.quiz_gen.temperature
            )
            
            all_questions = []
            retrieval_top_k = cfg.quiz_gen.get("retrieval_top_k", 3)
            
            for i, chunk in enumerate(chunks):
                logger.debug(f"Generating questions for chunk {i+1}/{len(chunks)}")
                
                # Retrieve relevant context from knowledge base
                retrieved_context = ""
                if vector_store is not None:
                    # Extract section title for better retrieval
                    header_match = re.search(r'^##\s+(.+)$', chunk, re.MULTILINE)
                    query = header_match.group(1) if header_match else chunk[:200]
                    
                    context_chunks = retrieve_context_from_vector_store(
                        vector_store, 
                        query, 
                        top_k=retrieval_top_k
                    )
                    
                    if context_chunks:
                        retrieved_context = "\n\n".join([
                            f"[Source {idx+1}]: {ctx['text'][:1000]}"
                            for idx, ctx in enumerate(context_chunks)
                        ])
                        logger.debug(f"Retrieved {len(context_chunks)} context chunks from knowledge base")
                    else:
                        logger.debug(f"No context retrieved from knowledge base for chunk {i+1}")
                else:
                    logger.debug("Vector store not available, generating questions without knowledge base context")
                
                # Build prompt with both module chunk and retrieved context
                prompt = cfg.quiz_gen.quiz_generation_prompt_template.format(
                    content_chunk=chunk,
                    retrieved_context=retrieved_context if retrieved_context else "No additional context available.",
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
    
    # Load vector store for knowledge base retrieval
    logger.info("Loading knowledge base vector store...")
    vector_store = load_vector_store(cfg)
    if vector_store:
        logger.info("✅ Vector store loaded successfully")
    else:
        logger.warning("⚠️ Vector store not available - will generate questions without knowledge base context")
    
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
        vector_store=vector_store,
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
    - quiz_gen.course_id: Course ID for vector store selection (optional, default from config)
    - quiz_gen.module_name: Module name override (optional)
    - quiz_gen.output: Custom output path (optional)
    - quiz_gen.questions_per_chunk: Number of questions per chunk (optional)
    - quiz_gen.retrieval_top_k: Number of knowledge base chunks to retrieve (optional)
    
    Example usage:
        python sme/quiz_gen/main.py \\
            quiz_gen.course_id=EC2101 \\
            quiz_gen.module_content_path=outputs/module.md \\
            quiz_gen.questions_per_chunk=2 \\
            quiz_gen.retrieval_top_k=3
    """
    logger.info("Initializing LangGraph Quiz Generator")
    
    # Log configuration
    course_id = cfg.quiz_gen.get('course_id', 'Not specified')
    batch_size = cfg.quiz_gen.get('batch_size', 2)
    questions_per_batch = cfg.quiz_gen.get('questions_per_batch', 3)
    logger.info(f"Course ID: {course_id}")
    logger.info(f"Retrieval top-k: {cfg.quiz_gen.get('retrieval_top_k', 3)}")
    logger.info(f"Batching: {questions_per_batch} questions per {batch_size} chunks")
    
    # Get module content path
    content_path = getattr(cfg.quiz_gen, 'module_content_path', None)
    if not content_path:
        logger.error("Please specify module content path with quiz_gen.module_content_path='path/to/module.md'")
        logger.info("Example: python sme/quiz_gen/main.py quiz_gen.course_id=EC2101 quiz_gen.module_content_path=path/to/module.md")
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