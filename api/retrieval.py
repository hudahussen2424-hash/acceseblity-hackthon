"""Keyword retrieval and sensitive-topic guard for indexed lesson sections."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TOKEN_RE = re.compile(r"[\w]+", re.UNICODE)


def _words(text: str) -> set[str]:
    return {word.casefold() for word in TOKEN_RE.findall(text) if len(word) > 1}


def _section_text(section: dict, language: str) -> str:
    value = section.get("text", "")
    if isinstance(value, dict):
        selected = value.get(language) or value.get("en") or ""
        # Builder placeholders are not usable course text.
        if isinstance(selected, str) and selected.strip().upper().startswith("TODO:"):
            selected = value.get("en", "")
        return selected if isinstance(selected, str) else ""
    return value if isinstance(value, str) else ""


def normalized_section(section: dict, language: str) -> dict:
    result = dict(section)
    result["text"] = _section_text(section, language)
    result["url"] = str(section.get("url") or "")
    result["title"] = str(section.get("title") or section.get("id") or "Course section")
    return result


def retrieve(question: str, sections: list[dict], language: str) -> list[tuple[float, dict]]:
    query = _words(question)
    if not query:
        return []
    ranked = []
    for original in sections:
        section = normalized_section(original, language)
        terms = _words(section["title"] + " " + section["text"])
        if not terms:
            continue
        overlap = query & terms
        # Title hits count slightly more, then normalize by query length.
        title_terms = _words(section["title"])
        score = min(1.0, (len(overlap) + 0.5 * len(query & title_terms)) / len(query))
        ranked.append((score, section))
    return sorted(ranked, key=lambda item: item[0], reverse=True)


def sensitive_topic(question: str, topics_path: Path | None = None) -> bool:
    path = topics_path or ROOT.parent / "module" / "i18n" / "topics.json"
    try:
        topics = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        topics = {"en": [], "am": []}
    folded = question.casefold()
    return any(
        isinstance(word, str) and word and word.casefold() in folded
        for language in ("en", "am")
        for word in topics.get(language, [])
    )
