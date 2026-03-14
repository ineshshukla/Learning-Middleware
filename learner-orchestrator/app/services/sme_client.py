"""
SME Service Client for Learner Orchestrator
Handles communication with SME service for module generation, quiz generation, and chat.
"""

import requests
import logging
from typing import Dict, List, Any, Optional
from fastapi import HTTPException
from app.core.config import settings

logger = logging.getLogger(__name__)


class SMEServiceClient:
    """Client for communicating with the SME (Subject Matter Expert) service."""
    
    def __init__(self, base_url: str = "http://sme:8000", timeout: int = 3000):
        """
        Initialize SME client.
        
        Args:
            base_url: Base URL of SME service
            timeout: Request timeout in seconds (default: 3000 = 50 minutes for LLM operations)
        """
        self.base_url = base_url
        self.kli_base_url = settings.kli_sme_service_url.rstrip('/')
        self.timeout = timeout

    def generate_kli_golden_sample(
        self,
        course_id: str,
        module_id: str,
        module_name: str,
        learning_objective: str,
        subject_domain: str = "",
        grade_level: str = "",
    ) -> Dict[str, Any]:
        """Generate KLI golden sample for an objective."""
        payload = {
            "courseID": course_id,
            "moduleID": module_id,
            "module_name": module_name,
            "subject_domain": subject_domain,
            "grade_level": grade_level,
            "learning_objective": learning_objective,
        }

        try:
            response = requests.post(
                f"{self.kli_base_url}/generate-golden-sample",
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to generate KLI golden sample: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate KLI golden sample: {str(e)}"
            )

    def personalize_kli_module(
        self,
        course_id: str,
        module_id: str,
        golden_sample: str,
        subtopics: List[Dict[str, Any]],
        user_profile: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Personalize approved golden sample using KLI personalizer."""
        payload = {
            "courseID": course_id,
            "moduleID": module_id,
            "golden_sample": golden_sample,
            "subtopics": subtopics,
            "userProfile": user_profile,
        }

        try:
            response = requests.post(
                f"{self.kli_base_url}/personalize-module",
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to personalize KLI module: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to personalize KLI module: {str(e)}"
            )
    
    def generate_module_content(
        self,
        course_id: str,
        user_profile: Dict[str, Any],
        module_lo: Dict[str, Dict[str, List[str]]],
        module_id: str = None
    ) -> Dict[str, str]:
        """
        Generate module content based on learning objectives and user preferences.
        
        Args:
            course_id: Course ID
            user_profile: User preferences dict with structure:
                {
                    "_id": {"CourseID": "...", "LearnerID": "..."},
                    "preferences": {
                        "DetailLevel": "detailed" | "moderate" | "brief",
                        "ExplanationStyle": "examples-heavy" | "conceptual" | "practical" | "visual",
                        "Language": "simple" | "technical" | "balanced"
                    },
                    "lastUpdated": "ISO datetime"
                }
            module_lo: Module name mapped to learning objectives:
                {
                    "Module Name": {
                        "learning_objectives": ["LO1", "LO2", ...]
                    }
                }
            module_id: Optional module ID for module-specific vector store
        
        Returns:
            Dictionary mapping module names to markdown content:
            {"Module Name": "# Module Title\n\n## Content..."}
        """
        try:
            payload = {
                "courseID": course_id,
                "userProfile": user_profile,
                "ModuleLO": module_lo
            }
            
            # Add module_id if provided for module-specific vector store
            if module_id:
                payload["moduleID"] = module_id
            
            response = requests.post(
                f"{self.base_url}/generate-module",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to generate module content: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate module content: {str(e)}"
            )
    
    def generate_quiz(
        self,
        module_content: str,
        module_name: str,
        course_id: str,
        module_id: str = None
    ) -> Dict[str, Any]:
        """
        Generate quiz questions from module content using module-specific vector stores.
        
        Args:
            module_content: Full module content in markdown format
            module_name: Name of the module
            course_id: Course ID for vector store selection
            module_id: Optional module ID for module-specific vector store usage
        
        Returns:
            Dictionary containing quiz data with questions
        """
        try:
            payload = {
                "courseID": course_id,
                "module_content": module_content,
                "module_name": module_name
            }
            
            # Add module_id if provided for module-specific vector store usage
            if module_id:
                payload["module_id"] = module_id
                logger.info(f"Using module-specific vector store for module: {module_id}")
            
            response = requests.post(
                f"{self.kli_base_url}/generate-quiz",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to generate quiz: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate quiz: {str(e)}"
            )
    
    def chat_with_content(
        self,
        course_id: str,
        user_prompt: str,
        module_id: str = None
    ) -> Dict[str, Any]:
        """
        Chat with course content using RAG with optional module-specific context.
        
        Args:
            course_id: Course ID for vector store selection
            user_prompt: User's question/prompt
            module_id: Optional module ID for module-specific vector store usage
        
        Returns:
            Dictionary containing chat response and sources
        """
        try:
            payload = {
                "courseid": course_id,
                "userprompt": user_prompt
            }
            
            # Add module_id if provided for module-specific vector store usage
            if module_id:
                payload["moduleid"] = module_id
                logger.info(f"Using module-specific chat for module: {module_id}")
            
            response = requests.post(
                f"{self.kli_base_url}/chat",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to chat with content: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to chat with content: {str(e)}"
            )
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check if SME service is healthy.
        
        Returns:
            Health status dictionary
        """
        try:
            response = requests.get(
                f"{self.kli_base_url}/health",
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"SME health check failed: {e}")
            return {"status": "unhealthy", "error": str(e)}


# Singleton instance
sme_client = SMEServiceClient()
