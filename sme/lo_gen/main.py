"""Learning Objectives Generator.

Generates learning objectives for educational modules using LLM and vector store retrieval.
"""
import json
import os
import re
import time
import signal
from pathlib import Path
from typing import List, Dict, Optional

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
    
    vs_path = PROJECT_ROOT / cfg.lo_gen.vector_store_dir
    
    if not vs_path.exists():
        logger.warning(f"Vector store path does not exist: {vs_path}")
        return None
        
    try:
        embeddings = HuggingFaceEmbeddings(
            model_name=cfg.lo_gen.embedding_model, 
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


def retrieve_chunks_from_vector_store(vector_store, query: str, top_k: int = 5) -> List[Dict]:
    """Retrieve relevant chunks from vector store.
    
    Args:
        vector_store: FAISS vector store instance
        query: Search query
        top_k: Number of chunks to retrieve
        
    Returns:
        List of document chunks with metadata
    """
    try:
        retriever = vector_store.as_retriever(search_kwargs={"k": top_k})
        docs = retriever.invoke(query)
        
        results = []
        for i, doc in enumerate(docs):
            results.append({
                "title": doc.metadata.get("filename", doc.metadata.get("source", f"doc-{i}")),
                "text": doc.page_content[:4000],
                "source_id": i,
                "metadata": doc.metadata
            })
        return results
    except Exception as e:
        logger.error(f"Failed to retrieve from vector store: {e}")
        return []


def keyword_search(cfg: DictConfig, query: str, max_docs: int = 5) -> List[Dict]:
    """Fallback keyword-based search when vector store is unavailable.
    
    Args:
        cfg: Hydra configuration
        query: Search query
        max_docs: Maximum number of documents to return
        
    Returns:
        List of document chunks sorted by keyword match score
    """
    hits = []
    query_terms = query.lower().split()
    doc_dir = PROJECT_ROOT / cfg.lo_gen.docs_dir
    
    for file_path in sorted(doc_dir.glob("*")):
        if not file_path.is_file():
            continue
        try:
            content = file_path.read_text(errors="ignore")
        except Exception:
            content = ""
        
        score = sum(content.lower().count(term) for term in query_terms)
        if score > 0:
            hits.append((score, file_path.name, content[:4000]))
    
    hits.sort(reverse=True, key=lambda x: x[0])
    return [{"title": h[1], "text": h[2], "source_id": i} for i, h in enumerate(hits[:max_docs])]


# ============================================================================
# Parsing and Validation
# ============================================================================

class TimeoutException(Exception):
    """Exception raised when parsing takes too long."""
    pass

def timeout_handler(signum, frame):
    """Signal handler for timeout."""
    raise TimeoutException("Parsing timeout")

def parse_json_array_safe(text: str, timeout_seconds: int = 10) -> Optional[List[str]]:
    """Safe wrapper for parse_json_array with timeout protection.
    
    Args:
        text: Model output text
        timeout_seconds: Maximum time allowed for parsing
        
    Returns:
        List of validated learning objectives or None if parsing failed/timeout
    """
    try:
        # Set up timeout (only works on Unix-like systems)
        if hasattr(signal, 'SIGALRM'):
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(timeout_seconds)
        
        result = parse_json_array(text)
        
        if hasattr(signal, 'SIGALRM'):
            signal.alarm(0)  # Cancel the alarm
        
        return result
    except TimeoutException:
        logger.error(f"Parsing timeout after {timeout_seconds} seconds")
        if hasattr(signal, 'SIGALRM'):
            signal.alarm(0)
        return None
    except Exception as e:
        logger.error(f"Unexpected error in parsing: {e}")
        if hasattr(signal, 'SIGALRM'):
            signal.alarm(0)
        return None

def parse_json_array(text: str) -> Optional[List[str]]:
    """Parse JSON array from model output, handling various formats and thinking tokens.
    
    Uses multiple strategies to extract learning objectives from model responses:
    1. Handle /think tokens explicitly
    2. Look for JSON arrays anywhere in text
    3. Extract from numbered objective patterns
    4. Handle other thinking delimiters
    5. Extract from quoted strings as fallback
    
    Args:
        text: Model output text
        
    Returns:
        List of validated learning objectives or None if parsing failed
    """
    text = text.strip()
    
    # Limit text length to prevent excessive processing time
    if len(text) > 10000:
        logger.warning(f"Response too long ({len(text)} chars), truncating to 10000 chars")
        text = text[:10000]
    
    logger.debug(f"Parsing text (first 200 chars): {repr(text[:200])}")
    logger.debug(f"Parsing text (last 400 chars): {repr(text[-400:])}")
    
    # Quick strategy: Try to find complete JSON array first (most common case)
    # Look for pattern like ["...", "...", ...]
    try:
        # Simple regex for well-formed JSON array
        simple_json_match = re.search(r'\[\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*\]', text, re.DOTALL)
        if simple_json_match:
            json_str = simple_json_match.group(0)
            logger.debug(f"Quick match found JSON: {repr(json_str[:150])}")
            try:
                parsed = json.loads(json_str)
                if isinstance(parsed, list) and len(parsed) > 0 and all(isinstance(x, str) for x in parsed):
                    valid = validate_objectives(parsed)
                    if valid:
                        logger.debug(f"Quick parse successful: {len(valid)} objectives")
                        return valid
            except json.JSONDecodeError:
                logger.debug("Quick parse failed, continuing with full parsing")
    except Exception as e:
        logger.debug(f"Quick parse error: {e}, continuing with full parsing")
    
    # Strategy 1: Handle /think token (for thinking models)
    if '/think' in text.lower():
        parts = re.split(r'/think', text, flags=re.IGNORECASE)
        if len(parts) > 1:
            answer_text = parts[-1].strip()
            logger.debug(f"Found /think token, extracted answer: {repr(answer_text[:300])}")
            try:
                parsed = json.loads(answer_text)
                if isinstance(parsed, list) and all(isinstance(x, str) for x in parsed):
                    logger.debug(f"Successfully parsed JSON after /think: {len(parsed)} items")
                    return validate_objectives(parsed)
            except json.JSONDecodeError as e:
                logger.debug(f"JSON parse error after /think: {e}")
                json_match = re.search(r'(\[(?:[^[\]]*"[^"]*"[^[\]]*)*\])', answer_text, re.DOTALL)
                if json_match:
                    try:
                        parsed = json.loads(json_match.group(1))
                        if isinstance(parsed, list) and all(isinstance(x, str) for x in parsed):
                            return validate_objectives(parsed)
                    except:
                        pass
    
    # Strategy 2: Look for JSON array anywhere in text
    # Using a more efficient regex pattern to avoid backtracking issues
    json_pattern = r'\[(?:[^[\]"]|"(?:[^"\\]|\\.)*")*\]'
    try:
        all_json_matches = list(re.finditer(json_pattern, text, re.DOTALL))
    except Exception as e:
        logger.warning(f"Regex matching timeout/error: {e}")
        all_json_matches = []
    
    if all_json_matches:
        for match in reversed(all_json_matches):  # Try from last to first
            try:
                json_str = match.group(0)
                logger.debug(f"Trying JSON match: {repr(json_str[:150])}")
                parsed = json.loads(json_str)
                if isinstance(parsed, list) and len(parsed) > 0 and all(isinstance(x, str) for x in parsed):
                    logger.debug(f"Successfully parsed JSON array with {len(parsed)} items")
                    valid = validate_objectives(parsed)
                    if valid:
                        return valid
            except json.JSONDecodeError as e:
                logger.debug(f"JSON parse error: {e}")
                continue
    
    # Strategy 3: Extract from numbered objective patterns
    objective_patterns = [
        r'Objective \d+[:\.]?\s*["\']([^"\']+)["\']',
        r'\d+\.\s*["\']([^"\']+)["\']',
        r'^\s*-\s*["\']([^"\']+)["\']',
    ]
    
    extracted_objectives = []
    for pattern in objective_patterns:
        matches = re.findall(pattern, text, re.MULTILINE)
        if matches:
            logger.debug(f"Found {len(matches)} objectives using pattern: {pattern}")
            extracted_objectives.extend(matches)
            if len(extracted_objectives) >= 3:
                break
    
    if extracted_objectives:
        valid = validate_objectives(extracted_objectives)
        if valid:
            return valid
    
    # Strategy 4: Handle other thinking delimiters
    thinking_patterns = [
        r'</think>\s*(.*)',
        r'<think>.*?</think>\s*(.*)',
        r'<thinking>.*?</thinking>\s*(.*)',
        r'Output the JSON array now:\s*(.*)',
        r'(?:Here is|Here are) (?:the|my) .*?:\s*(.*)',
    ]
    
    for pattern in thinking_patterns:
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            extracted = match.group(1).strip()
            logger.debug(f"Extracted after pattern: {repr(extracted[:200])}")
            try:
                parsed = json.loads(extracted)
                if isinstance(parsed, list) and all(isinstance(x, str) for x in parsed):
                    valid = validate_objectives(parsed)
                    if valid:
                        return valid
            except:
                json_in_extracted = re.search(json_pattern, extracted, re.DOTALL)
                if json_in_extracted:
                    try:
                        parsed = json.loads(json_in_extracted.group(0))
                        if isinstance(parsed, list) and all(isinstance(x, str) for x in parsed):
                            valid = validate_objectives(parsed)
                            if valid:
                                return valid
                    except:
                        pass
    
    # Strategy 5: Extract from quoted strings (fallback)
    quoted_strings = re.findall(r'"([^"]+)"', text)
    if quoted_strings:
        logger.debug(f"Found {len(quoted_strings)} quoted strings (fallback)")
        objectives = []
        skip_terms = [
            'context', 'requirement', 'example', 'format', 'json', 'array',
            'objective', 'action_verb', 'word_count', 'is_', 'must be',
            'starts with', 'specific', 'actionable', 'builds upon',
            'ranking algorithms'
        ]
        
        for string in quoted_strings:
            cleaned = string.strip()
            word_count = len(cleaned.split())
            if (8 <= word_count <= 20 and
                not any(skip in cleaned.lower() for skip in skip_terms if skip) and
                not cleaned.lower() in skip_terms):
                objectives.append(cleaned)
        
        valid = validate_objectives(objectives[:15])
        if valid:
            return valid
    
    logger.debug(f"No valid objectives found in response")
    return None


def validate_objectives(objectives: List[str]) -> List[str]:
    """Validate objectives based on schema requirements.
    
    Checks:
    - Word count (6-20 words)
    - Minimum length (15 characters)
    - Logs validation details
    
    Args:
        objectives: List of objective strings to validate
        
    Returns:
        List of valid objectives or None if none are valid
    """
    valid = []
    action_verbs = [
        # Learning-focused verbs
        'understand', 'explain', 'describe', 'identify', 'recognize', 'recall',
        'comprehend', 'interpret', 'summarize', 'classify', 'distinguish',
        # Analysis verbs
        'analyze', 'compare', 'contrast', 'examine', 'investigate', 'explore',
        'evaluate', 'assess', 'critique', 'justify', 'determine',
        # Application verbs (theoretical application)
        'apply', 'demonstrate', 'illustrate', 'relate', 'use', 'employ',
        # Higher-order thinking
        'synthesize', 'design', 'develop', 'create', 'formulate', 'propose'
    ]
    
    for obj in objectives:
        obj_clean = obj.strip()
        word_count = len(obj_clean.split())
        obj_lower = obj_clean.lower()
        
        starts_with_verb = any(obj_lower.startswith(verb) for verb in action_verbs)
        
        # Relaxed validation for better results
        if 6 <= word_count <= 20 and len(obj_clean) > 15:
            valid.append(obj_clean)
            logger.debug(f"Valid objective: {obj_clean} (words: {word_count}, verb: {starts_with_verb})")
        else:
            logger.debug(f"Filtered: {obj_clean} (words: {word_count}, length: {len(obj_clean)})")
    
    return valid if valid else None


# ============================================================================
# Main Generation Function
# ============================================================================

def generate_los_for_modules(cfg: DictConfig, modules: List[str], top_k: int = None, 
                             n_los: int = None, save_path: Optional[Path] = None) -> Dict[str, Dict]:
    """Generate learning objectives for multiple modules.
    
    Args:
        cfg: Hydra configuration
        modules: List of module titles
        top_k: Number of context chunks to retrieve
        n_los: Number of learning objectives per module
        save_path: Optional path to save results
        
    Returns:
        Dictionary mapping module names to their learning objectives and metadata
    """
    # Use config defaults if not provided
    if top_k is None:
        top_k = cfg.lo_gen.default_top_k
    if n_los is None:
        n_los = cfg.lo_gen.default_n_los
        
    # Load LangChain vector store
    vector_store = load_vector_store(cfg)

    results = {}
    for module in modules:
        logger.info(f"Processing module: {module}")
        
        # Step 1: Retrieve context chunks
        chunks = []
        if vector_store is not None:
            chunks = retrieve_chunks_from_vector_store(vector_store, module, top_k=top_k)
        
        if not chunks:
            logger.warning(f"No vector store chunks found for {module}, using keyword search")
            chunks = keyword_search(cfg, module, max_docs=top_k)

        # Step 2: Generate objectives with LLM using prompt from config
        context_text = chunks[0].get('text', '')[:800] if chunks else ''
        
        prompt = cfg.lo_gen.main_prompt_template.format(
            n_los=n_los,
            module_title=module,
            context=context_text
        )
        
        logger.debug(f"Sending prompt to model...")
        result = infer_4b(prompt, max_tokens=800, temperature=0.1)
        resp = result.get('text', '') if result.get('ok') else ''
        logger.debug(f"Response length: {len(resp)} chars")

        # Step 3: Parse response
        parsed = parse_json_array_safe(resp)
        
        if not parsed:
            logger.error(f"Failed to parse valid objectives for module '{module}'.")
            parsed = []
        
        # Step 4: Normalize objectives and remove duplicates
        normalized = []
        seen_objectives = set()
        
        for lo in parsed:
            if len(normalized) >= n_los:
                break
            
            s = lo.strip().rstrip(".")
            if not s or len(s.split()) < 4:
                continue
            
            # Ensure starts with capital letter
            if not s[0].isupper():
                s = s[0].upper() + s[1:]
            
            # Check for duplicates
            s_lower = s.lower()
            is_duplicate = (s_lower == module.lower() or 
                          any(s_lower == seen.lower() for seen in seen_objectives))
            
            if not is_duplicate:
                normalized.append(s)
                seen_objectives.add(s)
        
        # Step 5: Generate additional objectives if needed
        attempts = 0
        max_attempts = 5 if normalized else 10
        logger.info(f"Starting with {len(normalized)} objectives, need {n_los - len(normalized)} more")
        
        while len(normalized) < n_los and chunks and attempts < max_attempts:
            attempts += 1
            remaining = n_los - len(normalized)
            
            # Vary focus for diversity
            focus_areas = [
                "implementation and application",
                "evaluation and analysis", 
                "design and creation",
                "comparison and understanding"
            ]
            focus = focus_areas[min(attempts - 1, len(focus_areas) - 1)]
            
            context_sample = chunks[min(attempts-1, len(chunks)-1)].get('text', '')[:800] if chunks else ""
            covered_topics = ', '.join([' '.join(obj.split()[:3]) for obj in normalized]) if normalized else "none"
            
            additional_prompt = (
                f"Generate ONLY a JSON array without any thinking, explanations, or word counts.\n\n"
                f"Task: Create {remaining} additional learning objectives for: {module}\n"
                f"Focus: {focus}\n"
                f"Context: {context_sample}\n"
                f"Already covered: {covered_topics}\n\n"
                f"Requirements:\n"
                f"- 8-18 words per objective\n"
                f"- Start with action verbs: Understand, Explain, Analyze, Compare, Evaluate, Describe\n"
                f"- Must be different from already covered topics\n"
                f"- Focus on theoretical and conceptual understanding\n\n"
                f"Output ONLY the JSON array:\n["
            )
            
            additional_result = infer_4b(additional_prompt, max_tokens=400, temperature=0.1)
            additional_resp = additional_result.get('text', '') if additional_result.get('ok') else ''
            additional_parsed = parse_json_array_safe(additional_resp) or []
            
            for additional_lo in additional_parsed:
                if len(normalized) >= n_los:
                    break
                
                s = additional_lo.strip().rstrip(".")
                if not s or len(s.split()) < 4:
                    continue
                if not s[0].isupper():
                    s = s[0].upper() + s[1:]
                
                # Check for duplicates with similarity threshold
                s_lower = s.lower()
                is_duplicate = False
                
                for seen in seen_objectives:
                    if s_lower == seen.lower():
                        is_duplicate = True
                        break
                    # Check word overlap for near-duplicates
                    if len(s_lower.split()) > 4:
                        s_words = set(s_lower.split())
                        seen_words = set(seen.lower().split())
                        overlap_ratio = len(s_words & seen_words) / len(s_words)
                        if overlap_ratio > 0.7:
                            is_duplicate = True
                            break
                
                if not is_duplicate and not s.lower().startswith(('objective ', 'learning objective', 'new objective')):
                    normalized.append(s)
                    seen_objectives.add(s)
            
            if not additional_parsed:
                break
        
        # Step 6: Store results
        results[module] = {
            "learning_objectives": normalized[:n_los],
            "raw_model_output": resp,
            "context_chunks": chunks
        }
        
        # Display generated objectives
        print(f"\n🎯 Learning Objectives for '{module}':")
        print("=" * (len(module) + 30))
        for i, objective in enumerate(normalized[:n_los], 1):
            print(f"{i}. {objective}")
        print(f"\n✅ Generated {len(normalized[:n_los])} objectives\n")
        logger.info(f"[{module}] -> {len(normalized[:n_los])} LOs")

    # Save results to file
    if save_path is None:
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        save_dir = PROJECT_ROOT / cfg.lo_gen.outputs_dir / f"los-{timestamp}"
        save_dir.mkdir(parents=True, exist_ok=True)
        save_path = save_dir / "los.json"
    
    with open(save_path, "w") as f:
        json.dump(results, f, indent=2)
    logger.info(f"Saved results to {save_path}")
    
    return results


# ============================================================================
# Main Entry Point
# ============================================================================

@hydra.main(config_path="../conf", config_name="config", version_base=None)
def main(cfg: DictConfig) -> None:
    """Main entry point for the learning objectives generator.
    
    Args:
        cfg: Hydra configuration
    """
    logger.info("Initializing Learning Objectives Generator")
    
    # Parse modules from config or file
    modules = []
    
    if hasattr(cfg.lo_gen, 'modules') and cfg.lo_gen.modules:
        if isinstance(cfg.lo_gen.modules, str):
            modules = [cfg.lo_gen.modules]
        else:
            modules = list(cfg.lo_gen.modules)
    
    elif hasattr(cfg.lo_gen, 'modules_file') and cfg.lo_gen.modules_file:
        modules_file_path = Path(cfg.lo_gen.modules_file)
        if modules_file_path.exists():
            with open(modules_file_path) as fh:
                modules = [l.strip() for l in fh if l.strip()]
        else:
            logger.error(f"Modules file not found: {modules_file_path}")
            return
    
    if not modules:
        logger.error("No modules provided. Use: lo_gen.modules=[\"Module 1\",\"Module 2\"] or lo_gen.modules_file=path/to/file.txt")
        return
    
    # Get generation parameters
    top_k = getattr(cfg.lo_gen, 'top_k', None) or cfg.lo_gen.default_top_k
    n_los = getattr(cfg.lo_gen, 'n_los', None) or cfg.lo_gen.default_n_los
    save_path = getattr(cfg.lo_gen, 'save_path', None)
    
    if save_path:
        save_path = Path(save_path)
    
    logger.info(f"Processing {len(modules)} modules with top_k={top_k}, n_los={n_los}")
    generate_los_for_modules(cfg, modules, top_k=top_k, n_los=n_los, save_path=save_path)




if __name__ == "__main__":
    main()
