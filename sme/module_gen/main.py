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
import signal
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
        FAISS vector store or None if failed
    """
    if not LANGCHAIN_AVAILABLE:
        logger.error("LangChain not available. Cannot load vector store.")
        return None
    
    vs_path = PROJECT_ROOT / cfg.rag.vector_store_path
    
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


def retrieve_context_for_objectives(vector_store, module_name: str, 
                                    objectives: List[str], top_k: int = 3) -> Dict[str, List[Dict]]:
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
        try:
            retriever = vector_store.as_retriever(search_kwargs={"k": top_k})
            docs = retriever.invoke(query)
            
            chunks = []
            for i, doc in enumerate(docs):
                chunks.append({
                    "text": doc.page_content[:2000],  # Limit chunk size
                    "source": doc.metadata.get("filename", doc.metadata.get("source", f"doc-{i}")),
                    "metadata": doc.metadata
                })
            context_map[obj] = chunks
            logger.debug(f"Retrieved {len(chunks)} chunks for: {obj[:60]}...")
        except Exception as e:
            logger.error(f"Failed to retrieve context for objective: {e}")
            context_map[obj] = []
    
    return context_map


# ============================================================================
# Content Parsing Functions
# ============================================================================

class TimeoutException(Exception):
    """Exception raised when parsing takes too long."""
    pass


def timeout_handler(signum, frame):
    """Signal handler for timeout."""
    raise TimeoutException("Parsing timeout")


def parse_module_content(text: str, timeout_seconds: int = 15) -> Optional[Dict[str, Any]]:
    """Parse structured module content from model output with timeout protection.
    
    Expected format (flexible):
    - Sections with headers
    - Content organized by learning objectives
    - Examples and explanations
    
    Args:
        text: Model output text
        timeout_seconds: Maximum time allowed for parsing
        
    Returns:
        Parsed content structure or None if parsing failed
    """
    try:
        # Set up timeout (only works on Unix-like systems)
        if hasattr(signal, 'SIGALRM'):
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(timeout_seconds)
        
        result = _parse_content(text)
        
        if hasattr(signal, 'SIGALRM'):
            signal.alarm(0)
        
        return result
    except TimeoutException:
        logger.error(f"Content parsing timeout after {timeout_seconds} seconds")
        if hasattr(signal, 'SIGALRM'):
            signal.alarm(0)
        return None
    except Exception as e:
        logger.error(f"Unexpected error in content parsing: {e}")
        if hasattr(signal, 'SIGALRM'):
            signal.alarm(0)
        return None


def _parse_content(text: str) -> Dict[str, Any]:
    """Internal function to parse module content.
    
    Strategies:
    1. Try to parse as JSON if present
    2. Parse markdown/structured text format
    3. Extract sections based on headers
    """
    text = text.strip()
    
    # Limit text length
    if len(text) > 50000:
        logger.warning(f"Response too long ({len(text)} chars), truncating to 50000 chars")
        text = text[:50000]
    
    # Remove thinking tokens if present
    if '/think' in text.lower():
        parts = re.split(r'/think', text, flags=re.IGNORECASE)
        if len(parts) > 1:
            text = parts[-1].strip()
    
    # Strategy 1: Try JSON format
    json_match = re.search(r'\{[\s\S]*\}', text)
    if json_match:
        try:
            content = json.loads(json_match.group(0))
            if isinstance(content, dict):
                logger.debug("Successfully parsed JSON content")
                return content
        except json.JSONDecodeError:
            pass
    
    # Strategy 2: Parse structured markdown/text
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
    
    # If no sections found, treat entire text as single section
    if not content["sections"]:
        content["sections"].append({
            "title": "Content",
            "content": text
        })
    
    return content


# ============================================================================
# User Preference Formatting
# ============================================================================

def format_user_preferences(preferences: Dict[str, Any]) -> str:
    """Format user preferences into a readable instruction string.
    
    Args:
        preferences: User preference dictionary
        
    Returns:
        Formatted preference string for prompt
    """
    prefs = preferences.get("preferences", {})
    
    detail_level = prefs.get("DetailLevel", "moderate")
    explanation_style = prefs.get("ExplanationStyle", "balanced")
    language_style = prefs.get("Language", "technical")
    
    pref_text = f"""
User Learning Preferences:
- Detail Level: {detail_level} ({"provide comprehensive explanations with in-depth coverage" if detail_level == "detailed" else "provide concise, focused explanations" if detail_level == "brief" else "provide moderate detail with clear explanations"})
- Explanation Style: {explanation_style} ({"include many concrete examples and use-cases" if explanation_style == "examples-heavy" else "focus on theoretical concepts and principles" if explanation_style == "theory-focused" else "balance theory with practical examples"})
- Language: {language_style} ({"use precise technical terminology" if language_style == "technical" else "use simple, accessible language" if language_style == "simple" else "balance technical terms with clear explanations"})
"""
    return pref_text.strip()


# ============================================================================
# Main Content Generation Function
# ============================================================================

def generate_module_content(cfg: DictConfig, module_name: str, 
                           learning_objectives: List[str],
                           user_preferences: Dict[str, Any],
                           top_k_per_objective: int = 3) -> Dict[str, Any]:
    """Generate structured module content based on learning objectives and user preferences.
    
    Args:
        cfg: Hydra configuration
        module_name: Name of the module
        learning_objectives: List of learning objectives
        user_preferences: User preference dictionary
        top_k_per_objective: Number of context chunks per objective
        
    Returns:
        Generated module content with metadata
    """
    logger.info(f"Generating content for module: {module_name}")
    logger.info(f"Learning objectives: {len(learning_objectives)}")
    
    # Load vector store
    vector_store = load_vector_store(cfg)
    if not vector_store:
        logger.error("Vector store not available, cannot generate content")
        return {
            "module_name": module_name,
            "status": "error",
            "error": "Vector store not available"
        }
    
    # Retrieve context for each objective
    logger.info("Retrieving context from vector store...")
    context_map = retrieve_context_for_objectives(
        vector_store, module_name, learning_objectives, top_k_per_objective
    )
    
    # Aggregate all context
    all_context = []
    for obj, chunks in context_map.items():
        for chunk in chunks:
            all_context.append(chunk["text"])
    
    # Combine context with size limits for 4096 token budget
    # Token limit: 4096 total = 2048 input + 2048 output
    # Input budget: 2048 tokens = ~8192 chars
    # Context budget: ~5000 chars (leaving ~3000 for prompt template + objectives)
    combined_context = "\n\n---\n\n".join(all_context[:8])  # Max 8 chunks
    if len(combined_context) > 5000:
        combined_context = combined_context[:5000] + "\n\n[Context truncated for length...]"
    
    # Format user preferences
    pref_text = format_user_preferences(user_preferences)
    
    # Build prompt - keep concise to fit 2048 token input budget
    objectives_text = "\n".join([f"{i+1}. {obj}" for i, obj in enumerate(learning_objectives)])
    
    prompt = f"""Create comprehensive markdown content for this module.

Module: {module_name}

Learning Objectives:
{objectives_text}

{pref_text}

Context from Materials:
{combined_context}

Instructions:
1. Cover ALL learning objectives
2. Use markdown: ##/### headers, **bold**, *italic*, ```code```, tables
3. Include explanations, examples, key concepts
4. Adapt style to user preferences
5. Ensure logical flow between topics

Generate complete module content:

# {module_name}

"""

    logger.debug(f"Sending content generation prompt to model (length: {len(prompt)} chars)")
    logger.debug(f"Context size: {len(combined_context)} chars")
    estimated_input_tokens = len(prompt) // 4
    available_output_tokens = 4096 - estimated_input_tokens - 100  # 100 token buffer
    logger.debug(f"Estimated input tokens: ~{estimated_input_tokens}")
    logger.debug(f"Available output tokens: ~{available_output_tokens} (with 100 token buffer)")
    
    # Dynamically calculate max_tokens based on actual input size
    max_output_tokens = min(available_output_tokens, 3000)  # Cap at 3000 for safety
    logger.info(f"Using max_tokens={max_output_tokens} for output generation")
    
    # Call LLM with optimized token allocation
    result = infer_4b(prompt, max_tokens=max_output_tokens, temperature=0.3)
    
    if not result.get('ok'):
        error_msg = result.get('error', 'Unknown error')
        logger.error(f"LLM call failed: {error_msg}")
        return {
            "module_name": module_name,
            "status": "error",
            "error": f"LLM generation failed: {error_msg}"
        }
    
    response_text = result.get('text', '')
    logger.debug(f"Received response: {len(response_text)} chars")
    
    # Clean up response - remove thinking tokens and extract actual content
    clean_text = response_text.strip()
    
    # Strategy 1: Look for /think delimiter
    if '/think' in clean_text.lower():
        parts = re.split(r'/think', clean_text, flags=re.IGNORECASE)
        if len(parts) > 1:
            clean_text = parts[-1].strip()
            logger.debug("Removed thinking tokens using /think delimiter")
    
    # Strategy 2: Look for the actual markdown header (# Module_Name)
    header_match = re.search(rf'^#\s+{re.escape(module_name)}', clean_text, re.MULTILINE)
    if header_match:
        # Extract content starting from the header
        clean_text = clean_text[header_match.start():]
        logger.debug(f"Extracted content starting from header (position {header_match.start()})")
    
    logger.debug(f"Cleaned content: {len(clean_text)} chars")
    
    # Parse the generated content (for JSON metadata)
    parsed_content = parse_module_content(clean_text)
    
    if not parsed_content:
        logger.warning("Failed to parse content structure, using raw text")
        parsed_content = {
            "sections": [{
                "title": "Content",
                "content": clean_text
            }]
        }
    
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
            "num_context_chunks": len(all_context),
            "content_length": len(clean_text)
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
    """
    logger.info("Initializing Module Content Generator")
    
    # Get file paths from config or use defaults
    lo_file = getattr(cfg.module_gen, 'lo_file', 'module_gen/sample_lo.json')
    pref_file = getattr(cfg.module_gen, 'pref_file', 'module_gen/sample_userpref.json')
    output_path = getattr(cfg.module_gen, 'output', None)
    
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
    result = generate_module_content(
        cfg, 
        module_name, 
        learning_objectives, 
        user_prefs,
        top_k_per_objective=3
    )
    logger.info("=" * 80)
    
    # Check if generation was successful
    if result.get("status") == "error":
        logger.error(f"Failed to generate content: {result.get('error', 'Unknown error')}")
        print(f"\n❌ Error: {result.get('error', 'Unknown error')}\n")
        return
    
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
