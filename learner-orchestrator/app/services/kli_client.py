"""KLI-SME client for learner-side personalisation."""

import logging
from typing import Any, Dict, List, Optional

import requests
from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)


class KLISMEServiceClient:
    """Client for runtime golden-sample personalisation."""

    def __init__(self, base_url: str = settings.kli_sme_service_url, timeout: int = 3000):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def personalize_module(
        self,
        *,
        course_id: str,
        module_id: Optional[str],
        golden_sample: str,
        subtopics: List[Dict[str, Any]],
        user_profile: Dict[str, Any],
    ) -> Dict[str, Any]:
        payload = {
            "courseID": course_id,
            "moduleID": module_id,
            "golden_sample": golden_sample,
            "subtopics": subtopics,
            "userProfile": user_profile,
        }

        try:
            response = requests.post(
                f"{self.base_url}/personalize-module",
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as exc:
            logger.error(f"Failed to personalize module via KLI-SME: {exc}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to personalize module: {str(exc)}",
            )


kli_client = KLISMEServiceClient()
