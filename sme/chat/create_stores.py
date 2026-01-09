"""
Script to create all vector stores for a course.
Run this script after adding course documents to create the global and module-specific vector stores.

Usage:
    python create_stores.py
    
This will read the course_id from config.yaml and create:
- 1 global vector store containing ONLY files directly in data/docs/{course_id}/ (not in module subdirectories)
- n module-specific vector stores, one for each subdirectory in data/docs/{course_id}/
"""

import hydra
from omegaconf import DictConfig
from loguru import logger
import os
import sys

# Add parent directory to path to import rag module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rag import create_course_vector_stores


@hydra.main(config_path="../conf", config_name="config", version_base=None)
def main(cfg: DictConfig) -> None:
    """Create all vector stores for a course."""
    logger.info("Starting vector store creation")
    
    # Get course_id from config
    course_id = cfg.rag.get('course_id', None)
    
    if not course_id:
        logger.error("course_id must be specified in config.yaml under rag section")
        return
    
    logger.info(f"Creating vector stores for course: {course_id}")
    
    # Create all vector stores
    try:
        stores = create_course_vector_stores(
            cfg.rag.docs_path,
            cfg.rag.vector_store_path,
            cfg.rag.embedding_model_name,
            "cpu",
            course_id
        )
        
        logger.info("=" * 60)
        logger.info("Vector stores created successfully!")
        logger.info("=" * 60)
        logger.info(f"Global vector store: ✓")
        logger.info(f"Module vector stores: {len(stores['modules'])} modules")
        for module_id in stores['modules'].keys():
            logger.info(f"  - {module_id}: ✓")
        logger.info("=" * 60)
        logger.info("\nYou can now use these vector stores in chat by:")
        logger.info("1. For global store: Set module_id: null in config.yaml")
        logger.info(f"2. For module-specific: Set module_id: 'module_name' in config.yaml")
        logger.info("\nExample module IDs available:")
        for module_id in list(stores['modules'].keys())[:3]:
            logger.info(f"  - {module_id}")
        
    except Exception as e:
        logger.error(f"Failed to create vector stores: {e}")
        raise


if __name__ == "__main__":
    main()
