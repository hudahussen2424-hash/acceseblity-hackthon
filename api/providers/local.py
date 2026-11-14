"""Ollama's OpenAI-compatible chat completions adapter."""
import os
from urllib.parse import urlparse

from .openai_compatible import complete


async def answer(question: str, sections: list[dict], language: str) -> dict:
    base = os.getenv("OLLAMA_URL", "http://localhost:11434/v1").rstrip("/")
    url = base if base.endswith("/chat/completions") else f"{base}/chat/completions"
    if urlparse(url).scheme not in ("http", "https"):
        raise ValueError("OLLAMA_URL must use HTTP or HTTPS.")
    return await complete(url, os.getenv("OLLAMA_MODEL", "llama3.2"), question, sections, language)
