"""Learning Objectives Generator.

Generates learning objectives for educational modules using LLM and vector store retrieval.
"""
import json
import os
import re
import time
from pathlib import Path
from typing import List, Dict, Optional

from dotenv import load_dotenv
import hydra
from omegaconf import DictConfig
from loguru import logger

from vllm_client import VLLM_4B_URL, infer_4b

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
    
    # If course_id is provided, use course-specific vector store path
    course_id = cfg.lo_gen.get('course_id', None)
    if course_id:
        vs_path = vs_path / course_id
        logger.info(f"Using course-specific vector store path: {vs_path}")
    
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
    
    # If course_id is provided, use course-specific docs directory
    course_id = cfg.lo_gen.get('course_id', None)
    if course_id:
        doc_dir = doc_dir / course_id
        logger.info(f"Using course-specific docs directory: {doc_dir}")
    
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

def parse_json_array_safe(text: str, timeout_seconds: int = 10) -> Optional[List[str]]:
    """Safe wrapper for parse_json_array with timeout protection.
    
    Args:
        text: Model output text
        timeout_seconds: Maximum time allowed for parsing
        
    Returns:
        List of validated learning objectives or None if parsing failed/timeout
    """
    try:
        # Simple timeout approach - just limit text length and processing
        # Signal handling doesn't work in FastAPI threads
        result = parse_json_array(text)
        return result
    except Exception as e:
        logger.error(f"Error in parsing: {e}")
        return None

def parse_json_array(text: str) -> Optional[List[str]]:
    """Parse JSON array from model output, handling various formats and thinking tokens.
    
    Uses multiple strategies to extract learning objectives from model responses:
    1. Handle /think tokens explicitly
    2. Look for JSON arrays anywhere in text
    3. Extract from numbered objective patterns
    4. Handle other thinking delimiters
    5. NO FALLBACK - only accept proper objectives
    
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
                    # Check for placeholders immediately
                    if any(obj.strip().lower().startswith(('lo', 'objective')) or len(obj.strip().split()) < 6 for obj in parsed):
                        logger.debug("Quick parse rejected: contains placeholders or too short")
                        # Continue to other strategies
                    else:
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
                    # Check for placeholders
                    if not any(obj.strip().lower().startswith(('lo', 'objective')) or len(obj.strip().split()) < 6 for obj in parsed):
                        logger.debug(f"Successfully parsed JSON after /think: {len(parsed)} items")
                        return validate_objectives(parsed)
            except json.JSONDecodeError as e:
                logger.debug(f"JSON parse error after /think: {e}")
                json_match = re.search(r'(\[(?:[^[\]]*"[^"]*"[^[\]]*)*\])', answer_text, re.DOTALL)
                if json_match:
                    try:
                        parsed = json.loads(json_match.group(1))
                        if isinstance(parsed, list) and all(isinstance(x, str) for x in parsed):
                            if not any(obj.strip().lower().startswith(('lo', 'objective')) or len(obj.strip().split()) < 6 for obj in parsed):
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
                    # Reject placeholders
                    if any(obj.strip().lower().startswith(('lo', 'objective')) or len(obj.strip().split()) < 6 for obj in parsed):
                        logger.debug("JSON match rejected: contains placeholders or too short")
                        continue
                    logger.debug(f"Successfully parsed JSON array with {len(parsed)} items")
                    valid = validate_objectives(parsed)
                    if valid:
                        return valid
            except json.JSONDecodeError as e:
                logger.debug(f"JSON parse error: {e}")
                continue
    
    # Strategy 3: Extract from numbered objective patterns
    objective_patterns = [
        r'\d+\.\s+([A-Z][^.]+\.?)',  # "1. Understand the concept..."
        r'^\s*-\s+([A-Z][^.]+\.?)',  # "- Analyze the framework..."
        r'Objective \d+[:\.]?\s+([A-Z][^.]+\.?)',  # "Objective 1: Explain..."
    ]
    
    extracted_objectives = []
    for pattern in objective_patterns:
        matches = re.findall(pattern, text, re.MULTILINE)
        if matches:
            logger.debug(f"Found {len(matches)} objectives using pattern: {pattern}")
            # Filter out placeholders
            valid_matches = [m for m in matches if not m.strip().lower().startswith(('lo', 'objective')) and len(m.strip().split()) >= 6]
            extracted_objectives.extend(valid_matches)
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
                    # Check for placeholders
                    if not any(obj.strip().lower().startswith(('lo', 'objective')) or len(obj.strip().split()) < 6 for obj in parsed):
                        valid = validate_objectives(parsed)
                        if valid:
                            return valid
            except:
                json_in_extracted = re.search(json_pattern, extracted, re.DOTALL)
                if json_in_extracted:
                    try:
                        parsed = json.loads(json_in_extracted.group(0))
                        if isinstance(parsed, list) and all(isinstance(x, str) for x in parsed):
                            if not any(obj.strip().lower().startswith(('lo', 'objective')) or len(obj.strip().split()) < 6 for obj in parsed):
                                valid = validate_objectives(parsed)
                                if valid:
                                    return valid
                    except:
                        pass
    
    # NO FALLBACK STRATEGY - we only want proper learning objectives
    logger.debug(f"No valid objectives found in response - rejecting fallback strategies")
    return None


def validate_objectives(objectives: List[str]) -> List[str]:
    """Validate objectives based on schema requirements.
    
    Checks:
    - Word count (6-20 words)
    - Minimum length (20 characters)
    - Rejects placeholders and invalid content
    - Must start with action verbs
    
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
        'evaluate', 'assess', 'critique', 'justify', 'determine', 'derive',
        # Application verbs (theoretical application)
        'apply', 'demonstrate', 'illustrate', 'relate', 'use', 'employ'
    ]
    
    placeholder_patterns = [
        'lo1', 'lo2', 'lo3', 'lo4', 'lo5', 'lo6',
        'objective 1', 'objective 2', 'objective 3',
        'learning objective', 'new objective', 'additional objective'
    ]
    
    for obj in objectives:
        obj_clean = obj.strip().rstrip('.')
        word_count = len(obj_clean.split())
        obj_lower = obj_clean.lower()
        
        # Check for placeholders
        is_placeholder = any(placeholder in obj_lower for placeholder in placeholder_patterns)
        if is_placeholder:
            logger.debug(f"Rejected placeholder: {obj_clean}")
            continue
        
        # Check word count and length
        if not (6 <= word_count <= 20 and len(obj_clean) >= 20):
            logger.debug(f"Filtered by length/word count: {obj_clean} (words: {word_count}, length: {len(obj_clean)})")
            continue
        
        # Check if starts with action verb
        starts_with_verb = any(obj_lower.startswith(verb) for verb in action_verbs)
        if not starts_with_verb:
            logger.debug(f"Filtered by verb requirement: {obj_clean}")
            continue
        
        # Additional content quality checks
        if (obj_clean.count(' ') < 5 or  # Too few spaces
            len(set(obj_clean.lower().split())) < 4):  # Too few unique words
            logger.debug(f"Filtered by content quality: {obj_clean}")
            continue
        
        valid.append(obj_clean)
        logger.debug(f"Valid objective: {obj_clean} (words: {word_count}, verb: {starts_with_verb})")
    
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

        # Step 2: Keep retrying until we get valid objectives - no fallbacks
        normalized = []
        seen_objectives = set()
        max_main_attempts = 10
        main_attempt = 0
        
        while len(normalized) < n_los and main_attempt < max_main_attempts:
            main_attempt += 1
            context_text = chunks[0].get('text', '')[:800] if chunks else ''
            
            # Create a more explicit prompt that discourages placeholder responses
            enhanced_prompt = (
                f"Generate exactly {n_los} complete learning objectives for the module: {module}\n\n"
                f"Context: {context_text}\n\n"
                f"CRITICAL REQUIREMENTS:\n"
                f"- Each objective must be 8-18 words long\n"
                f"- Start with action verbs: Understand, Explain, Analyze, Compare, Evaluate, Describe, Apply\n"
                f"- Must be actual learning objectives, NOT placeholders like 'LO1', 'LO2'\n"
                f"- Focus on theoretical and conceptual understanding\n"
                f"- Output ONLY a JSON array of strings\n\n"
                f"Example format: [\"Understand the fundamental principles of quantum mechanics in field theory\", \"Analyze the mathematical foundations of relativistic quantum field equations\"]\n\n"
                f"Generate {n_los} actual learning objectives now:"
            )
            from dotenv import load_dotenv
            load_dotenv()
            VLLM_4B_URL = os.getenv('VLLM_4B_URL', 'http://localhost:8001/v1').rstrip('/')
            VLLM_4B_MODEL = os.getenv('VLLM_4B_MODEL', './Qwen3-4B-Thinking-2507-Q4_K_M.gguf')
            logger.info(f"Calling VLLM 4B model at {VLLM_4B_URL} with model {VLLM_4B_MODEL}")
            logger.info(f"Main attempt {main_attempt} for module: {module}")
            result = infer_4b(enhanced_prompt, max_tokens=800, temperature=0.2)
            resp = result.get('text', '') if result.get('ok') else ''
            logger.debug(f"Response length: {len(resp)} chars")

            # Parse response - only accept valid objectives
            parsed = parse_json_array_safe(resp)
            
            if parsed:
                # Process valid objectives
                for lo in parsed:
                    if len(normalized) >= n_los:
                        break
                    
                    s = lo.strip().rstrip(".")
                    if not s or len(s.split()) < 6:  # Stricter minimum
                        continue
                    
                    # Skip obvious placeholders
                    if s.lower().startswith(('lo', 'objective', 'learning objective')):
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
                        logger.info(f"Added valid objective: {s}")
        
        # Step 3: Generate additional objectives if still needed
        additional_attempts = 0
        max_additional_attempts = 15
        
        while len(normalized) < n_los and additional_attempts < max_additional_attempts:
            additional_attempts += 1
            remaining = n_los - len(normalized)
            
            # Vary focus and context for diversity
            focus_areas = [
                "theoretical foundations and principles",
                "mathematical analysis and derivations", 
                "conceptual understanding and interpretation",
                "comparison and evaluation of different approaches",
                "application of theories and methods"
            ]
            focus = focus_areas[min(additional_attempts - 1, len(focus_areas) - 1)]
            
            context_sample = chunks[min(additional_attempts-1, len(chunks)-1)].get('text', '')[:600] if chunks else ""
            covered_topics = [obj.split()[:4] for obj in normalized] if normalized else []
            
            additional_prompt = (
                f"Generate {remaining} MORE learning objectives for: {module}\n\n"
                f"Focus area: {focus}\n"
                f"Context: {context_sample}\n\n"
                f"AVOID these already covered topics: {covered_topics}\n\n"
                f"Requirements:\n"
                f"- Each objective: 8-18 words\n"
                f"- Start with: Understand, Explain, Analyze, Compare, Evaluate, Describe, Apply, Derive\n"
                f"- NO placeholders (LO1, LO2, etc.)\n"
                f"- Must be different from existing objectives\n"
                f"- Focus on {focus}\n\n"
                f"Output exactly {remaining} objectives as JSON array:"
            )
            
            logger.info(f"Additional attempt {additional_attempts}, need {remaining} more objectives")
            additional_result = infer_4b(additional_prompt, max_tokens=600, temperature=0.3)
            additional_resp = additional_result.get('text', '') if additional_result.get('ok') else ''
            additional_parsed = parse_json_array_safe(additional_resp) or []
            
            added_count = 0
            for additional_lo in additional_parsed:
                if len(normalized) >= n_los:
                    break
                
                s = additional_lo.strip().rstrip(".")
                if not s or len(s.split()) < 6:  # Stricter minimum
                    continue
                    
                # Skip placeholders
                if s.lower().startswith(('lo', 'objective', 'learning objective')):
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
                        if overlap_ratio > 0.6:  # More lenient for diversity
                            is_duplicate = True
                            break
                
                if not is_duplicate:
                    normalized.append(s)
                    seen_objectives.add(s)
                    added_count += 1
                    logger.info(f"Added additional objective: {s}")
            
            if added_count == 0:
                logger.warning(f"No valid objectives added in attempt {additional_attempts}")
            
            # If we're not making progress, break to avoid infinite loop
            if additional_attempts > 5 and added_count == 0:
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
