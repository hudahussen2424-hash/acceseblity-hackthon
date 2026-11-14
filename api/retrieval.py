"""Python port of module/search.js plus the server sensitive-topic guard."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STOP_WORDS = set("""
a about above after again against all am an and any are aren't as at be because been before being
below between both but by can cannot could did do does doing down during each few for from further
had has have having he her here hers herself him himself his how i if in into is isn't it its
itself let's me more most my myself no nor not of off on once only or other ought our ours
ourselves out over own same she should so some such than that the their theirs them themselves then
there these they this those through to too under until up very was wasn't we were weren't what
when where which while who whom why will with won't would you your yours yourself yourselves
""".split())
AMHARIC_TITLES = {
    "what-is-shaping-the-future-of-va-work": "የቨርቹዋል አሲስታንት ሥራን ወደፊት ምን እየቀየረው ነው",
    "artificial-intelligence-and-the-future-of-va-work": "አርቲፊሻል ኢንተለጀንስ እና የቨርቹዋል አሲስታንት ሥራ ወደፊት",
    "what-clients-are-likely-to-value-more-and-more": "ቀጣሪዎች ወደፊት የሚሰጡት ነገሮች",
    "what-this-means-for-aspiring-virtual-assistants": "ይህ ለአዳዲስ ቨርቹዋል አሲስታንቶች ምን ይሆናል",
    "so-is-the-future-of-va-promising": "ታዲያ የቨርቹዋል አሲስታንት ሥራ የወደፊት ተስፋው ጥሩ ነው",
}
ETHIOPIC_PUNCT = re.compile(r"[\u1361-\u1368]")
GENERAL_PUNCT = re.compile(r"[!\"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]")
ETHIOPIC = re.compile(r"[\u1200-\u137f]")


def tokenize(text: str, language: str = "en") -> list[str]:
    if not isinstance(text, str) or not text:
        return []
    cleaned = ETHIOPIC_PUNCT.sub(" ", text)
    cleaned = re.sub(r"\[CHECK\]", " ", cleaned, flags=re.IGNORECASE)
    cleaned = GENERAL_PUNCT.sub(" ", cleaned)
    words = re.sub(r"\s+", " ", cleaned).strip().split()
    if language == "am":
        tokens: list[str] = []
        for word in words:
            if ETHIOPIC.search(word):
                tokens.extend(word[i:i + 2] for i in range(len(word) - 1))
                tokens.extend(word[i:i + 3] for i in range(len(word) - 2))
            else:
                lower = word.lower()
                if lower not in STOP_WORDS and len(lower) > 1:
                    tokens.append(lower)
        return tokens
    filtered = [word.lower() for word in words if word.lower() not in STOP_WORDS and len(word) > 1]
    return filtered if filtered else [word.lower() for word in words]


def _title(section: dict, language: str) -> str:
    title = section.get("title", "")
    if language == "am":
        if isinstance(title, dict) and title.get("am"):
            return str(title["am"])
        if section.get("id") in AMHARIC_TITLES:
            return AMHARIC_TITLES[section["id"]]
        return str(title) if not isinstance(title, dict) else ""
    return str(title.get("en", "") if isinstance(title, dict) else title)


def _body(section: dict, language: str) -> str:
    text = section.get("text", "")
    if isinstance(text, dict):
        return str(text.get(language) or text.get("en") or "")
    return str(text) if isinstance(text, str) else ""


def normalized_section(section: dict, language: str) -> dict:
    result = dict(section)
    result["title"] = _title(section, language) or str(section.get("id") or "Course section")
    result["text"] = _body(section, language)
    result["url"] = str(section.get("url") or "")
    return result


def score_section(query_tokens: list[str], section: dict, language: str = "en") -> float:
    unique_query = set(query_tokens)
    if not unique_query:
        return 0.0
    title_tokens = set(tokenize(_title(section, language), language))
    body_tokens = set(tokenize(_body(section, language), language))
    match_weight = sum(
        1.0 if token in title_tokens and token in body_tokens
        else 0.85 if token in title_tokens
        else 0.60 if token in body_tokens
        else 0.0
        for token in unique_query
    )
    return round(min(1.0, max(0.0, match_weight / len(unique_query))), 4)


def retrieve(question: str, sections: list[dict], language: str) -> list[tuple[float, dict]]:
    query_tokens = tokenize(question, language)
    if not query_tokens:
        return []
    ranked = [(score_section(query_tokens, section, language), normalized_section(section, language)) for section in sections]
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
