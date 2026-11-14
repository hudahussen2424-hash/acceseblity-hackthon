import asyncio
import pytest

from api.qa import SENSITIVE_REFUSAL, answer_question


SECTIONS = [{
    "id": "ai-va", "title": "Artificial intelligence for virtual assistants",
    "url": "/lesson#ai-va",
    "text": {"en": "Artificial intelligence can automate email drafting and spreadsheet organization for virtual assistants.",
             "am": "TODO: Translate to Amharic"},
}]


class FakeProvider:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error
        self.calls = 0

    async def answer(self, question, sections, language):
        self.calls += 1
        if self.error:
            raise self.error
        return self.result


def test_below_threshold_does_not_call_provider(monkeypatch):
    monkeypatch.setenv("THRESHOLD", "0.5")
    provider = FakeProvider({"text": "unexpected answer"})
    result = asyncio.run(answer_question("Where can I find the moon?", "en", SECTIONS, provider))
    assert provider.calls == 0
    assert result["mode"] == "search"
    assert result["answer"] == "I could not find this in the course."


def test_provider_failure_falls_back_to_best_section(monkeypatch):
    monkeypatch.setenv("THRESHOLD", "0.1")
    provider = FakeProvider(error=TimeoutError("provider timed out"))
    result = asyncio.run(answer_question("How does artificial intelligence help virtual assistants?", "en", SECTIONS, provider))
    assert provider.calls == 1
    assert result["mode"] == "search"
    assert "automate email drafting" in result["answer"]
    assert result["sources"] == [{"title": SECTIONS[0]["title"], "url": "/lesson#ai-va"}]


@pytest.mark.parametrize("question, language", [
    ("Can you give me legal advice?", "en"),
    ("Which medicine should I take for this symptom?", "en"),
    ("How do I apply for an immigration visa?", "en"),
    ("ስለ ሕግ ምክር እፈልጋለሁ", "am"),
])
def test_sensitive_topic_is_refused_without_provider_call(question, language):
    provider = FakeProvider({"text": "unsafe generated answer"})
    result = asyncio.run(answer_question(question, language, SECTIONS, provider))
    assert provider.calls == 0
    assert result["answer"] == SENSITIVE_REFUSAL
    assert result["mode"] == "search"
