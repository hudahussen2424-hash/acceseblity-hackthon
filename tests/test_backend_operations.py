"""Privacy-safe operations and evidence contracts for Track 3 hosting."""
import api.main as backend
from api.qa import _grounding


def test_answer_grounding_contains_verifiable_source_quote(monkeypatch):
    monkeypatch.setenv("THRESHOLD", "0.25")
    source = {"title": "Lesson 1", "url": "/lesson#one"}
    result = _grounding(0.82, "A verified sentence.", [source], "answered", "ai")

    assert result == {
        "status": "verified",
        "method": "verbatim-source-excerpt",
        "confidence": "high",
        "confidenceBasis": "retrieval-similarity-not-probability",
        "score": 0.82,
        "evidence": [{"title": "Lesson 1", "url": "/lesson#one", "quote": "A verified sentence."}],
    }
    assert _grounding(0.0, "", [], "not_found", "search")["evidence"] == []


def test_rate_limit_window_expires_and_returns_retry_delay(monkeypatch):
    backend._RATE_LIMIT_EVENTS.clear()
    monkeypatch.setenv("RATE_LIMIT_ASK", "2")
    monkeypatch.setenv("RATE_LIMIT_WINDOW_SECONDS", "60")

    assert backend._rate_limit_retry_after("ask", "test-client", now=100) is None
    assert backend._rate_limit_retry_after("ask", "test-client", now=101) is None
    assert backend._rate_limit_retry_after("ask", "test-client", now=102) == 58
    assert backend._rate_limit_retry_after("ask", "test-client", now=160) is None
    backend._RATE_LIMIT_EVENTS.clear()


def test_request_ids_reject_header_injection():
    assert backend._REQUEST_ID_PATTERN.fullmatch("client-request-1234")
    assert not backend._REQUEST_ID_PATTERN.fullmatch("bad\r\nX-Injected: yes")


def test_helper_operations_endpoints_return_aggregates_without_ticket_content(tmp_path, monkeypatch):
    monkeypatch.setattr(backend, "DB_PATH", tmp_path / "operations.sqlite3")
    monkeypatch.setenv("HELPER_TOKEN", "ops-test-token")
    backend.initialize()

    metrics = backend.helper_metrics("ops-test-token")
    health = backend.helper_content_health("ops-test-token")

    assert metrics["queue"]["waiting"] == 0
    assert metrics["queue"]["oldestWaitingMinutes"] is None
    assert metrics["last30Days"]["unreviewedAnswerFeedback"] == 0
    assert "conversation" not in metrics and "phone" not in metrics
    assert health["sectionsChecked"] > 0
    assert health["healthy"] is False
    assert any(issue["code"] == "missing_ar_text" for issue in health["issues"])
