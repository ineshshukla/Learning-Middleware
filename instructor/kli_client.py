"""KLI-SME service client used by the instructor workflow."""

import logging
from typing import Any, Dict, List, Optional

import requests
from fastapi import HTTPException

from config import settings

logger = logging.getLogger(__name__)


class KLISMEServiceClient:
    """Client for communicating with the KLI-SME service."""

    def __init__(self, base_url: str = settings.kli_sme_service_url):
        self.base_url = base_url.rstrip("/")
        self.timeout = 3000

    def generate_learning_objectives(
        self,
        *,
        courseid: str,
        moduleid: Optional[str],
        module_name: str,
        learning_intent: str,
        module_description: str = "",
        subject_domain: str = "",
        grade_level: str = "",
        n_los: int = 6,
    ) -> Dict[str, Any]:
        """Generate KLI-aligned learning objectives.

        Returns a dict with 'learning_objectives' and 'final_subtopics'.
        """
        payload = {
            "courseID": courseid,
            "moduleID": moduleid,
            "module_name": module_name,
            "module_description": module_description,
            "learning_intent": learning_intent,
            "subject_domain": subject_domain,
            "grade_level": grade_level,
            "n_los": n_los,
        }

        try:
            response = requests.post(
                f"{self.base_url}/generate-learning-objectives",
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
            return {
                "learning_objectives": data.get("learning_objectives", []),
                "final_subtopics": data.get("final_subtopics", []),
            }
        except requests.exceptions.RequestException as exc:
            logger.error(f"Failed to generate KLI learning objectives: {exc}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate KLI learning objectives: {str(exc)}",
            )

    def generate_golden_sample(
        self,
        *,
        courseid: str,
        moduleid: Optional[str],
        module_name: str,
        learning_objective: str,
        subject_domain: str = "",
        grade_level: str = "",
        pre_decided_subtopics: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Generate golden sample, optionally using pre-decided subtopics."""
        payload = {
            "courseID": courseid,
            "moduleID": moduleid,
            "module_name": module_name,
            "subject_domain": subject_domain,
            "grade_level": grade_level,
            "learning_objective": learning_objective,
        }
        if pre_decided_subtopics:
            payload["pre_decided_subtopics"] = pre_decided_subtopics

        try:
            response = requests.post(
                f"{self.base_url}/generate-golden-sample",
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as exc:
            logger.error(f"Failed to generate golden sample: {exc}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate golden sample: {str(exc)}",
            )


kli_client = KLISMEServiceClient()
