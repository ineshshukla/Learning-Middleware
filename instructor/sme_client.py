"""
SME Service Client - Handles communication with the SME service
"""
import requests
import os
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, UploadFile
import logging

logger = logging.getLogger(__name__)

# SME Service URL from environment
SME_SERVICE_URL = os.getenv("SME_SERVICE_URL", "http://sme:8000")


class SMEServiceClient:
    """Client for communicating with SME service."""
    
    def __init__(self, base_url: str = SME_SERVICE_URL):
        self.base_url = base_url.rstrip('/')
        self.timeout = 3000  # 5 minutes for generation tasks (increased for large PDFs)
    
    def health_check(self) -> bool:
        """Check if SME service is healthy."""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"SME service health check failed: {e}")
            return False
    
    def upload_files(
        self, 
        courseid: str, 
        files: List[UploadFile]
    ) -> Dict[str, Any]:
        """
        Upload course files to SME service.
        
        Args:
            courseid: Course ID
            files: List of files to upload
            
        Returns:
            Response from SME service with uploaded file details
        """
        try:
            # Prepare files for multipart upload
            files_data = []
            for file in files:
                # Reset file pointer to beginning
                file.file.seek(0)
                files_data.append(
                    ('files', (file.filename, file.file, file.content_type))
                )
            
            # Send request to SME
            response = requests.post(
                f"{self.base_url}/upload-file",
                data={'courseid': courseid},
                files=files_data,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to upload files to SME: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload files to SME service: {str(e)}"
            )
    
    def create_vector_store(self, courseid: str) -> Dict[str, Any]:
        """
        Create vector store for a course in SME service.
        
        Args:
            courseid: Course ID
            
        Returns:
            Response from SME service
        """
        try:
            response = requests.post(
                f"{self.base_url}/createvs",
                json={"courseid": courseid},
                timeout=self.timeout
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to create vector store: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create vector store: {str(e)}"
            )
    
    def generate_learning_objectives(
        self,
        courseid: str,
        module_names: List[str],
        n_los: int = 6
    ) -> Dict[str, List[str]]:
        """
        Generate learning objectives for modules.
        
        Args:
            courseid: Course ID
            module_names: List of module names
            n_los: Number of learning objectives per module (default: 6)
            
        Returns:
            Dictionary mapping module names to lists of learning objectives
        """
        try:
            payload = {
                "courseID": courseid,
                "ModuleName": module_names,
                "n_los": n_los
            }
            
            response = requests.post(
                f"{self.base_url}/generate-los",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to generate learning objectives: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate learning objectives: {str(e)}"
            )
    
    def generate_module_content(
        self,
        courseid: str,
        user_profile: Dict[str, Any],
        module_lo: Dict[str, Dict[str, List[str]]]
    ) -> Dict[str, str]:
        """
        Generate module content based on learning objectives.
        
        Args:
            courseid: Course ID
            user_profile: User preferences
            module_lo: Module name to learning objectives mapping
            
        Returns:
            Dictionary mapping module names to markdown content
        """
        try:
            payload = {
                "courseID": courseid,
                "userProfile": user_profile,
                "ModuleLO": module_lo
            }
            
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


# Singleton instance
sme_client = SMEServiceClient()
