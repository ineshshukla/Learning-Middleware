"""LangChain ChatOpenAI wrapper configured for vLLM."""

import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

# Load kli_sme's own .env (next to this file), then fall back to env vars
load_dotenv(Path(__file__).resolve().parent / ".env", override=False)

_DEFAULT_BASE_URL = os.getenv("VLLM_URL", "https://irel.iiit.ac.in/learn/api/llm/v1")
_DEFAULT_API_KEY = os.getenv("VLLM_API_KEY", "dummy")
_DEFAULT_MODEL = os.getenv("VLLM_MODEL", "Qwen/Qwen3-30B-A3B-GPTQ-Int4")


def get_llm(
    *,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    base_url: str | None = None,
    api_key: str | None = None,
    model: str | None = None,
) -> ChatOpenAI:
    """Return a ChatOpenAI instance pointed at the vLLM server.

    The default ``max_tokens`` is sized for a 30k context window so each
    node can produce substantial output without truncation.
    """
    return ChatOpenAI(
        base_url=base_url or _DEFAULT_BASE_URL,
        api_key=api_key or _DEFAULT_API_KEY,
        model=model or _DEFAULT_MODEL,
        temperature=temperature,
        max_tokens=max_tokens,
    )
