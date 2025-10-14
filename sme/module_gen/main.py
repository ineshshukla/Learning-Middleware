"""Module Content Generator.

Generates structured learning content for educational modules using:
- Learning objectives
- Module name
- User preferences
- Vector store retrieval for relevant context
"""
import json
import os
import re
import time
from pathlib import Path
from typing import List, Dict, Optional, Any

import hydra
from omegaconf import DictConfig
from loguru import logger

from vllm_client import infer_4b

try:
    from langchain_community.vectorstores import FAISS
    from langchain_huggingface import HuggingFaceEmbeddings
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logger.error("LangChain components not available. Please install required packages.")

# Configuration
os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')
PROJECT_ROOT = Path(__file__).parent.parent


# ============================================================================
# Vector Store Functions
# ============================================================================

def load_vector_store(cfg: DictConfig):
    """Load LangChain FAISS vector store.
    
    Args:
        cfg: Hydra configuration
        
    Returns:
        FAISS vector store
        
    Raises:
        Exception if loading fails
    """
    if not LANGCHAIN_AVAILABLE:
        raise Exception("LangChain not available. Install required packages.")
    
    vs_path = PROJECT_ROOT / cfg.rag.vector_store_path
    
    # If course_id is provided in module_gen config, use course-specific vector store path
    course_id = cfg.module_gen.get('course_id', None)
    if course_id:
        vs_path = vs_path / course_id
        logger.info(f"Using course-specific vector store path: {vs_path}")
    
    if not vs_path.exists():
        raise FileNotFoundError(f"Vector store not found: {vs_path}")
        
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


def retrieve_context_for_objectives(vector_store, module_name: str, 
                                    objectives: List[str], top_k: int) -> Dict[str, List[Dict]]:
    """Retrieve relevant context for each learning objective.
    
    Args:
        vector_store: FAISS vector store instance
        module_name: Name of the module
        objectives: List of learning objectives
        top_k: Number of chunks to retrieve per objective
        
    Returns:
        Dictionary mapping each objective to its retrieved context chunks
    """
    context_map = {}
    
    for obj in objectives:
        query = f"{module_name}: {obj}"
        retriever = vector_store.as_retriever(search_kwargs={"k": top_k})
        docs = retriever.invoke(query)
        
        chunks = []
        for i, doc in enumerate(docs):
            chunks.append({
                "text": doc.page_content[:1500],
                "source": doc.metadata.get("filename", doc.metadata.get("source", f"doc-{i}")),
                "metadata": doc.metadata
            })
        context_map[obj] = chunks
        logger.debug(f"Retrieved {len(chunks)} chunks for: {obj[:60]}...")
    
    return context_map


def summarize_chunks_for_objective(cfg: DictConfig, objective: str, 
                                  chunks: List[Dict], module_name: str) -> str:
    """Summarize retrieved chunks for a single learning objective.
    
    Args:
        cfg: Hydra configuration
        objective: The learning objective
        chunks: List of retrieved context chunks
        module_name: Name of the module
        
    Returns:
        Summarized context for the objective
    """
    if not chunks:
        raise ValueError(f"No context available for: {objective}")
    
    # Combine chunks
    combined_text = "\n\n".join([chunk["text"] for chunk in chunks])
    
    # Use configured prompt template
    prompt = cfg.module_gen.summarization_prompt_template.format(
        objective=objective,
        context=combined_text[:2000]
    )
    
    try:
        result = infer_4b(
            prompt, 
            max_tokens=cfg.module_gen.summarization_max_tokens,
            temperature=cfg.module_gen.summarization_temperature
        )
        if not result.get('ok'):
            logger.error(f"Summarization failed: {result.get('error', 'Unknown error')}")
            raise Exception("LLM call failed")
        
        summary = result.get('text', '').strip()
        original_length = len(summary)
        
        # Extract content after </think> delimiter
        if '</think>' in summary.lower():
            parts = re.split(r'</think>', summary, flags=re.IGNORECASE)
            extracted = parts[-1].strip()
            
            # Only use extracted part if it's substantial (more than 50 chars)
            # Otherwise, the model might have cut off mid-generation
            if len(extracted) > 50:
                summary = extracted
                logger.debug(f"Removed thinking tokens using </think> tag")
            else:
                logger.warning(f"Extracted summary too short ({len(extracted)} chars), using full response")
                # Keep the full response without think tag splitting
        
        # Print summary to terminal
        obj_preview = objective[:60] + "..." if len(objective) > 60 else objective
        print(f"\n📝 Summary for LO: {obj_preview}")
        print(f"{summary}\n")
        print("-" * 80)
        
        logger.debug(f"Summarized {len(combined_text)} chars -> {len(summary)} chars (original: {original_length})")
        return summary
        
    except Exception as e:
        logger.error(f"Error during summarization: {e}")
        raise


# ============================================================================
# Content Parsing Functions
# ============================================================================

def parse_module_content(text: str) -> Optional[Dict[str, Any]]:
    """Parse structured module content from model output.
    
    Expected format:
    - Sections with headers
    - Content organized by learning objectives
    - Examples and explanations
    
    Args:
        text: Model output text
        
    Returns:
        Parsed content structure or None if parsing failed
    """
    try:
        return _parse_content(text)
    except Exception as e:
        logger.error(f"Error parsing content: {e}")
        return None


def _parse_content(text: str) -> Dict[str, Any]:
    """Internal function to parse module content.
    
    Parses markdown/structured text format and extracts sections based on headers.
    """
    text = text.strip()
    
    # Limit text length
    if len(text) > 50000:
        logger.warning(f"Response too long ({len(text)} chars), truncating to 50000 chars")
        text = text[:50000]
    
    content = {
        "sections": [],
        "raw_content": text
    }
    
    # Split by common section markers
    section_pattern = r'^#{1,3}\s+(.+?)$|^([A-Z][^a-z\n]{5,})$'
    sections = re.split(section_pattern, text, flags=re.MULTILINE)
    
    current_section = None
    for part in sections:
        if not part:
            continue
        part = part.strip()
        if not part:
            continue
            
        # Check if it's a header
        if len(part) < 100 and (part[0] == '#' or part.isupper()):
            if current_section:
                content["sections"].append(current_section)
            current_section = {
                "title": part.lstrip('#').strip(),
                "content": ""
            }
        elif current_section:
            current_section["content"] += part + "\n\n"
        else:
            # Content before first section
            if not content["sections"]:
                content["sections"].append({
                    "title": "Introduction",
                    "content": part
                })
    
    # Add last section
    if current_section and current_section["content"]:
        content["sections"].append(current_section)
    
    return content


# ============================================================================
# User Preference Formatting
# ============================================================================

def format_user_preferences(cfg: DictConfig, preferences: Dict[str, Any]) -> str:
    """Format user preferences into a readable instruction string.
    
    Args:
        cfg: Hydra configuration
        preferences: User preference dictionary
        
    Returns:
        Formatted preference string for prompt
    """
    prefs = preferences.get("preferences", {})
    
    detail_level = prefs.get("DetailLevel", "moderate")
    explanation_style = prefs.get("ExplanationStyle", "conceptual")
    language_style = prefs.get("Language", "balanced")
    
    # Define descriptions based on preference values (aligned with Learner Orchestrator API)
    detail_desc_map = {
        "detailed": "provide comprehensive explanations with in-depth coverage",
        "moderate": "provide moderate detail with clear explanations",
        "brief": "provide concise, focused explanations"
    }
    
    explanation_desc_map = {
        "examples-heavy": "include many concrete examples and use-cases",
        "conceptual": "focus on theoretical concepts and principles",
        "practical": "balance theory with practical examples",
        "visual": "use visual representations and diagrams"
    }
    
    language_desc_map = {
        "simple": "use simple, accessible language",
        "technical": "use precise technical terminology",
        "balanced": "balance technical terms with clear explanations"
    }
    
    pref_text = cfg.module_gen.user_preference_format.format(
        detail_level=detail_level,
        detail_desc=detail_desc_map.get(detail_level, "provide moderate detail with clear explanations"),
        explanation_style=explanation_style,
        explanation_desc=explanation_desc_map.get(explanation_style, "focus on theoretical concepts and principles"),
        language_style=language_style,
        language_desc=language_desc_map.get(language_style, "balance technical terms with clear explanations")
    )
    
    return pref_text.strip()


# ============================================================================
# Main Content Generation Function
# ============================================================================

def generate_module_content(cfg: DictConfig, module_name: str, 
                           learning_objectives: List[str],
                           user_preferences: Dict[str, Any],
                           top_k_per_objective: Optional[int] = None) -> Dict[str, Any]:
    """Generate structured module content based on learning objectives and user preferences.
    
    Args:
        cfg: Hydra configuration
        module_name: Name of the module
        learning_objectives: List of learning objectives
        user_preferences: User preference dictionary
        top_k_per_objective: Number of context chunks per objective (uses config default if None)
        
    Returns:
        Generated module content with metadata
        
    Raises:
        Exception if generation fails
    """
    # Use config default if not provided
    if top_k_per_objective is None:
        top_k_per_objective = cfg.module_gen.default_top_k_per_objective
    
    logger.info(f"Generating content for module: {module_name}")
    logger.info(f"Learning objectives: {len(learning_objectives)}")
    logger.info(f"Top-k per objective: {top_k_per_objective}")
    
    # Load vector store
    vector_store = load_vector_store(cfg)
    
    # Retrieve context for each objective
    logger.info("Retrieving context from vector store...")
    context_map = retrieve_context_for_objectives(
        vector_store, module_name, learning_objectives, top_k_per_objective
    )
    
    # Summarize chunks for each learning objective
    logger.info("Summarizing context for each learning objective...")
    objective_summaries = {}
    for obj, chunks in context_map.items():
        summary = summarize_chunks_for_objective(cfg, obj, chunks, module_name)
        objective_summaries[obj] = summary
        logger.debug(f"Summary for '{obj[:50]}...': {len(summary)} chars")
    
    # Combine all summaries as reference material (not for direct presentation)
    reference_context = ""
    for i, (obj, summary) in enumerate(objective_summaries.items(), 1):
        reference_context += f"[Reference {i}] {obj}\n{summary}\n\n"
    
    logger.info(f"Total reference context: {len(reference_context)} chars for {len(learning_objectives)} objectives")
    
    # Format user preferences
    pref_text = format_user_preferences(cfg, user_preferences)
    
    # Build prompt using configured template
    objectives_text = "\n".join([f"{i+1}. {obj}" for i, obj in enumerate(learning_objectives)])
    
    prompt = cfg.module_gen.content_generation_prompt_template.format(
        module_name=module_name,
        objectives_text=objectives_text,
        pref_text=pref_text,
        reference_context=reference_context
    )

    logger.info(f"Prompt composition:")
    logger.info(f"  - Objectives: {len(objectives_text)} chars ({len(learning_objectives)} objectives)")
    logger.info(f"  - User prefs: {len(pref_text)} chars")
    logger.info(f"  - Reference context: {len(reference_context)} chars (summarized)")
    logger.info(f"  - Template: ~{len(prompt) - len(objectives_text) - len(pref_text) - len(reference_context)} chars")
    logger.info(f"  - TOTAL: {len(prompt)} chars")
    logger.debug(f"Sending content generation prompt to model (length: {len(prompt)} chars)")
    logger.debug(f"Reference context size: {len(reference_context)} chars")
    estimated_input_tokens = len(prompt) // 4
    available_output_tokens = 8192 - estimated_input_tokens - 100  # 100 token buffer
    logger.debug(f"Estimated input tokens: ~{estimated_input_tokens}")
    logger.debug(f"Available output tokens: ~{available_output_tokens} (with 100 token buffer)")
    
    # Dynamically calculate max_tokens based on actual input size
    max_output_tokens = available_output_tokens  # Cap at 3000 for safety
    logger.info(f"Using max_tokens={max_output_tokens} for output generation")
    
    # Call LLM with optimized token allocation and configured temperature
    result = infer_4b(
        prompt, 
        max_tokens=max_output_tokens, 
        temperature=cfg.module_gen.generation_temperature
    )
    
    if not result.get('ok'):
        error_msg = result.get('error', 'Unknown error')
        logger.error(f"LLM call failed: {error_msg}")
        raise Exception(f"LLM generation failed: {error_msg}")
    
    response_text = result.get('text', '')
    logger.debug(f"Received response: {len(response_text)} chars")
    
    # Clean up response - remove thinking tokens
    clean_text = response_text.strip()
    
    # Extract content after </think> delimiter
    if '</think>' in clean_text.lower():
        parts = re.split(r'</think>', clean_text, flags=re.IGNORECASE)
        clean_text = parts[-1].strip()
        logger.debug("Removed thinking tokens using </think> tag")
    
    logger.debug(f"Cleaned content: {len(clean_text)} chars")
    
    # Parse the generated content
    parsed_content = parse_module_content(clean_text)
    
    if not parsed_content:
        logger.error("Failed to parse content structure")
        raise Exception("Content parsing failed")
    
    # Build result
    result_data = {
        "module_name": module_name,
        "learning_objectives": learning_objectives,
        "user_preferences": user_preferences,
        "markdown_content": clean_text,  # Store the markdown content
        "content": parsed_content,
        "metadata": {
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "num_objectives": len(learning_objectives),
            "num_context_summaries": len(objective_summaries),
            "content_length": len(clean_text),
            "top_k_per_objective": top_k_per_objective
        }
    }
    
    logger.info(f"✅ Successfully generated content for '{module_name}'")
    logger.info(f"   Content sections: {len(parsed_content.get('sections', []))}")
    logger.info(f"   Total length: {len(clean_text)} characters")
    
    return result_data


# ============================================================================
# Main Entry Point
# ============================================================================

@hydra.main(config_path="../conf", config_name="config", version_base=None)
def main(cfg: DictConfig) -> None:
    """Main entry point for module content generation.
    
    Expects command line args or uses sample files:
    - module_gen.lo_file: Path to learning objectives JSON
    - module_gen.pref_file: Path to user preferences JSON
    - module_gen.module: Module name (optional if in LO file)
    - module_gen.output: Output path (optional)
    - module_gen.top_k_per_objective: Override default top_k (optional)
    """
    logger.info("Initializing Module Content Generator")
    
    # Get file paths from config or use defaults
    lo_file = getattr(cfg.module_gen, 'lo_file', 'module_gen/sample_lo.json')
    pref_file = getattr(cfg.module_gen, 'pref_file', 'module_gen/sample_userpref.json')
    output_path = getattr(cfg.module_gen, 'output', None)
    
    # Get top_k parameter (use command line override or config default)
    top_k_per_objective = getattr(cfg.module_gen, 'top_k_per_objective', None)
    
    # Load learning objectives
    lo_path = PROJECT_ROOT / lo_file
    if not lo_path.exists():
        logger.error(f"Learning objectives file not found: {lo_path}")
        return
    
    with open(lo_path) as f:
        lo_data = json.load(f)
    
    # Load user preferences
    pref_path = PROJECT_ROOT / pref_file
    if not pref_path.exists():
        logger.error(f"User preferences file not found: {pref_path}")
        return
    
    with open(pref_path) as f:
        user_prefs = json.load(f)
    
    # Get module name and objectives
    module_name = getattr(cfg.module_gen, 'module', None)
    
    if module_name and module_name in lo_data:
        module_data = lo_data[module_name]
    elif len(lo_data) == 1:
        # Use the only module in the file
        module_name = list(lo_data.keys())[0]
        module_data = lo_data[module_name]
    else:
        logger.error("Please specify module name with module_gen.module='Module Name'")
        logger.info(f"Available modules: {list(lo_data.keys())}")
        return
    
    learning_objectives = module_data.get("learning_objectives", [])
    
    if not learning_objectives:
        logger.error(f"No learning objectives found for module '{module_name}'")
        return
    
    # Generate content
    logger.info("=" * 80)
    try:
        result = generate_module_content(
            cfg, 
            module_name, 
            learning_objectives, 
            user_prefs,
            top_k_per_objective=top_k_per_objective  # Will use config default if None
        )
    except Exception as e:
        logger.error(f"Failed to generate content: {e}")
        print(f"\n❌ Error: {e}\n")
        return
    
    logger.info("=" * 80)
    
    # Determine output paths
    if output_path:
        # If output_path is provided, use it
        if output_path.endswith('.md'):
            md_file = Path(output_path)
            json_file = md_file.parent / f"{md_file.stem}_metadata.json"
        else:
            md_file = Path(output_path)
            json_file = md_file.parent / f"{md_file.stem}.json"
    else:
        # Default output location
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        output_dir = PROJECT_ROOT / "outputs" / f"module-{timestamp}"
        output_dir.mkdir(parents=True, exist_ok=True)
        md_file = output_dir / f"{module_name.lower().replace(' ', '_')}.md"
        json_file = output_dir / f"{module_name.lower().replace(' ', '_')}_metadata.json"
    
    # Ensure parent directory exists
    md_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Save the markdown file (primary output)
    markdown_content = result.get('markdown_content', '')
    
    # Add header with metadata if not already present
    if not markdown_content.startswith(f"# {module_name}"):
        markdown_header = f"""# {module_name}

**Generated:** {result['metadata']['generated_at']}  
**Learning Objectives:** {result['metadata']['num_objectives']}

---

## Learning Objectives

"""
        for i, obj in enumerate(learning_objectives, 1):
            markdown_header += f"{i}. {obj}\n"
        markdown_header += "\n---\n\n"
        markdown_content = markdown_header + markdown_content
    
    with open(md_file, "w", encoding="utf-8") as f:
        f.write(markdown_content)
    
    logger.info(f"📄 Saved module content (Markdown) to: {md_file}")
    
    # Save metadata JSON (optional, for programmatic access)
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    logger.info(f"� Saved metadata (JSON) to: {json_file}")
    
    print(f"\n{'='*80}")
    print(f"✅ Module content generated successfully!")
    print(f"{'='*80}")
    print(f"Module: {module_name}")
    print(f"Objectives covered: {len(learning_objectives)}")
    print(f"Markdown file: {md_file}")
    print(f"Metadata JSON: {json_file}")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    main()
