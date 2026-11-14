"""Provider disabled; retrieval-only behavior remains available."""


async def answer(question: str, sections: list[dict], language: str) -> dict:
    return {"text": None}
