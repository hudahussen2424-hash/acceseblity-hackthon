"""OpenAI-style HTTPS cloud provider adapter."""
import os
from urllib.parse import urlparse

from .openai_compatible import complete


async def answer(question: str, sections: list[dict], language: str) -> dict:
    url = os.getenv("CLOUD_URL", "").strip()
    key = os.getenv("CLOUD_API_KEY", "").strip()
    if not key or not url:
        raise ValueError("CLOUD_URL and CLOUD_API_KEY are required for cloud AI.")
    if urlparse(url).scheme != "https":
        raise ValueError("CLOUD_URL must use HTTPS.")
    return await complete(url, os.getenv("CLOUD_MODEL", "gpt-4o-mini"), question, sections, language, key)
