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
    if sensitive_topic(question):
        return {"answer": SENSITIVE_REFUSAL, "sources": [], "mode": "search", "score": best_score}

    try:
        threshold = float(os.getenv("THRESHOLD", "0.25"))
    except ValueError:
        threshold = 0.25
    if best is None or best_score < threshold:
        return {"answer": NOT_FOUND, "sources": [], "mode": "search", "score": best_score}

    retrieval_sources = [
        {"title": section["title"], "url": section["url"], **({"type": section["type"]} if "type" in section else {})}
        for score, section in ranked[:2] if score >= threshold
    ]

    if provider is None:
        name = os.getenv("AI_PROVIDER", "none").strip().lower()
        providers = {"none": "none", "local": "local", "cloud": "cloud"}
        if name not in providers:
            name = "none"
        provider = importlib.import_module(f".providers.{providers[name]}", package=__package__)
    try:
        result = await asyncio.wait_for(provider.answer(question, [section for _, section in ranked[:2]], language), timeout=5)
        text = result.get("text") if isinstance(result, dict) else None
        source_ids = result.get("source_ids") if isinstance(result, dict) else None
        allowed_sections = {
            section["id"]: section
            for _, section in ranked[:2]
            if isinstance(section.get("id"), str) and section["id"]
        }
        cited_ids = list(dict.fromkeys(source_ids)) if isinstance(source_ids, list) and all(
            isinstance(source_id, str) for source_id in source_ids
        ) else []
        if (
            not isinstance(text, str)
            or not text.strip()
            or text.strip() == "NOT_FOUND"
            or not cited_ids
            or any(source_id not in allowed_sections for source_id in cited_ids)
        ):
            raise ValueError("Provider did not return a cited answer.")
        cited_sources = [
            {"title": allowed_sections[source_id]["title"], "url": allowed_sections[source_id]["url"],
             **({"type": allowed_sections[source_id]["type"]} if "type" in allowed_sections[source_id] else {})}
            for source_id in cited_ids
        ]
        return {"answer": text.strip(), "sources": cited_sources, "mode": "ai", "score": best_score}
    except Exception:
        # Uncited, invalid, or unavailable model answers use the matched course text.
        return {"answer": best["text"], "sources": retrieval_sources, "mode": "search", "score": best_score}
