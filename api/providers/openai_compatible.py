"""Minimal async adapter for OpenAI-compatible chat completion endpoints."""
import asyncio
import json
import urllib.error
import urllib.request


SYSTEM_PROMPT = (
    "Answer ONLY from the provided sections, in the learner's language ({language}). "
    "If the answer is not in them, reply exactly NOT_FOUND. Do not give medical, legal or "
    "immigration advice. Keep it under 120 words and plain language."
)


def _request(url: str, model: str, question: str, sections: list[dict], language: str, key: str | None) -> dict:
    context = "\n\n".join(
        f"TITLE: {section.get('title', '')}\nTEXT: {section.get('text', '')}"
        for section in sections[:2]
    )
    body = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT.format(language=language)},
            {"role": "user", "content": f"Provided sections:\n{context}\n\nQuestion: {question}"},
        ],
        "temperature": 0.1,
        "max_tokens": 220,
    }).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = f"Bearer {key}"
    request = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=5) as response:
        result = json.loads(response.read().decode("utf-8"))
    text = result["choices"][0]["message"]["content"]
    return {"text": text.strip() if isinstance(text, str) else None}


async def complete(url: str, model: str, question: str, sections: list[dict], language: str, key: str | None = None) -> dict:
    return await asyncio.wait_for(
        asyncio.to_thread(_request, url, model, question, sections, language, key),
        timeout=5,
    )
