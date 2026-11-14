"""Question answering orchestration shared by the HTTP endpoint and tests."""
from __future__ import annotations

import asyncio
import importlib
import os

from .retrieval import retrieve, sensitive_topic

NOT_FOUND = "I could not find this in the course."
SENSITIVE_REFUSAL = "I can’t help with medical, legal, or immigration advice. Please talk to a tutor."


async def answer_question(question: str, language: str, sections: list[dict], provider=None) -> dict:
    ranked = retrieve(question, sections, language)
    best_score, best = ranked[0] if ranked else (0.0, None)
    sources = [{"title": section["title"], "url": section["url"]} for _, section in ranked[:2]]
    if sensitive_topic(question):
        return {"answer": SENSITIVE_REFUSAL, "sources": sources, "mode": "search", "score": best_score}

    try:
        threshold = float(os.getenv("THRESHOLD", "0.25"))
    except ValueError:
        threshold = 0.25
    if best is None or best_score < threshold:
        return {"answer": NOT_FOUND, "sources": sources, "mode": "search", "score": best_score}

    if provider is None:
        name = os.getenv("AI_PROVIDER", "none").strip().lower()
        providers = {"none": "none", "local": "local", "cloud": "cloud"}
        if name not in providers:
            name = "none"
        provider = importlib.import_module(f".providers.{providers[name]}", package=__package__)
    try:
        result = await asyncio.wait_for(provider.answer(question, [section for _, section in ranked[:2]], language), timeout=5)
        text = result.get("text") if isinstance(result, dict) else None
        if not isinstance(text, str) or not text.strip() or text.strip() == "NOT_FOUND":
            raise ValueError("Provider did not return an answer.")
        return {"answer": text.strip(), "sources": sources, "mode": "ai", "score": best_score}
    except Exception:
        # Provider errors, including timeouts, use the best matched course section.
        return {"answer": best["text"], "sources": sources, "mode": "search", "score": best_score}
