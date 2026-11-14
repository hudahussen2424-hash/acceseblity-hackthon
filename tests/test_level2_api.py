"""Tests for Level 2 API endpoints, status codes, CORS, and webhooks."""
import json
import os
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import pytest

from api.main import app, DB_PATH, connect, initialize


@pytest.fixture(autouse=True)
def setup_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_escalations_l2.sqlite3"
    monkeypatch.setattr("api.main.DB_PATH", test_db)
    initialize()
    yield test_db


@pytest.fixture
def client():
    return TestClient(app)


def test_swagger_docs_endpoint(client):
    res = client.get("/docs")
    assert res.status_code == 200
    assert "swagger-ui" in res.text.lower() or "html" in res.headers["content-type"]


def test_cors_headers_on_api(client):
    res = client.options(
        "/api/v1/ask",
        headers={
            "Origin": "http://localhost:8080",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") in ("*", "http://localhost:8080")


def test_content_endpoints(client):
    # GET initial content
    get_res = client.get("/api/v1/content")
    assert get_res.status_code == 200
    assert isinstance(get_res.json(), list)

    # POST invalid content -> 400
    bad_res = client.post("/api/v1/content", json="not a list")
    assert bad_res.status_code == 400

    # POST valid content -> 200
    new_sections = [{
        "id": "new-test-sec",
        "title": "Test Section Title",
        "url": "/lesson#test",
        "text": {"en": "Section body in English.", "am": "የሙከራ ክፍል ይዘት"},
    }]
    post_res = client.post("/api/v1/content", json=new_sections)
    assert post_res.status_code == 200
    assert post_res.json()["indexed"] == 1


def test_ask_endpoint(client):
    # Valid question -> 200 JSON
    res = client.post("/api/v1/ask", json={"question": "What is virtual assistant work?", "language": "en"})
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "sources" in data

    # Missing question -> 400 plain-words
    bad_res = client.post("/api/v1/ask", json={"language": "en"})
    assert bad_res.status_code == 400
    assert "question" in bad_res.text.lower() or "detail" in bad_res.json()

    # Invalid language -> 400
    bad_lang = client.post("/api/v1/ask", json={"question": "Hello", "language": "fr"})
    assert bad_lang.status_code == 400


def test_escalation_lifecycle_and_webhook(client, monkeypatch):
    webhook_calls = []

    def mock_urlopen(request, timeout=5):
        if request.get_full_url() == "https://webhook.example.test/opened":
            body = json.loads(request.data.decode("utf-8"))
            webhook_calls.append(body)
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.__enter__.return_value = mock_resp
        return mock_resp

    monkeypatch.setenv("WEBHOOK_URL", "https://webhook.example.test/opened")
    monkeypatch.setenv("HELPER_TOKEN", "test-secret-token")

    with patch("urllib.request.urlopen", side_effect=mock_urlopen):
        # 1. Create escalation -> 201 Created
        create_res = client.post(
            "/api/v1/escalations",
            json={
                "conversation": [{"from": "user", "text": "Can someone help me with section 1?"}],
                "language": "en",
                "page": "/savanna/pages/concept-with-navigation.html#what-is-shaping-the-future-of-va-work",
                "note": "Needs human guidance",
            },
        )
        assert create_res.status_code == 201
        data = create_res.json()
        assert "ticketId" in data
        ticket_id = data["ticketId"]

        # Webhook was invoked with { "event": "ticket.opened", "ticketId": ..., "at": ... }
        assert len(webhook_calls) == 1
        payload = webhook_calls[0]
        assert payload["event"] == "ticket.opened"
        assert payload["ticketId"] == ticket_id
        assert "at" in payload

        # 2. List waiting escalations -> 200 with valid helper token
        list_res = client.get("/api/v1/escalations", headers={"X-Helper-Token": "test-secret-token"})
        assert list_res.status_code == 200
        tickets = list_res.json()
        assert any(t["ticketId"] == ticket_id for t in tickets)

        # 3. Get single ticket -> 200
        get_res = client.get(f"/api/v1/escalations/{ticket_id}")
        assert get_res.status_code == 200
        assert get_res.json()["ticketId"] == ticket_id

        # 4. Reply to ticket -> 200
        reply_res = client.post(
            f"/api/v1/escalations/{ticket_id}/reply",
            headers={"X-Helper-Token": "test-secret-token"},
            json={"text": "Hello, I am your tutor. Let's review section 1 together."},
        )
        assert reply_res.status_code == 200
        assert reply_res.json()["message"] == "Reply saved."

        # 5. Non-existent ticket -> 404
        missing_res = client.get("/api/v1/escalations/non-existent-id")
        assert missing_res.status_code == 404

        # 6. Delete ticket -> 200
        del_res = client.delete(
            f"/api/v1/escalations/{ticket_id}",
            headers={"X-Helper-Token": "test-secret-token"},
        )
        assert del_res.status_code == 200

        # Now fetching deleted ticket returns 404
        assert client.get(f"/api/v1/escalations/{ticket_id}").status_code == 404


def test_jobs_notify_endpoint(client, monkeypatch):
    monkeypatch.setenv("HELPER_TOKEN", "test-secret-token")

    # Invalid job -> 400
    bad_res = client.post(
        "/api/v1/jobs/notify",
        headers={"X-Helper-Token": "test-secret-token"},
        json={"title": "Incomplete job"},
    )
    assert bad_res.status_code == 400

    # Valid job -> 200
    valid_job = {
        "id": "job-101",
        "title": "Remote VA Specialist",
        "location": "Addis Ababa",
        "url": "https://example.com/jobs/101",
        "description": "Assist with client communications and documentation.",
        "remote": True,
    }
    res = client.post(
        "/api/v1/jobs/notify",
        headers={"X-Helper-Token": "test-secret-token"},
        json={"job": valid_job},
    )
    assert res.status_code == 200
    data = res.json()
    assert "telegram" in data
    assert "sms" in data


def test_sms_inbound_both_routes(client):
    # Both /sms/inbound and /api/v1/sms/inbound work identically
    res1 = client.post("/sms/inbound", json={"from": "+12025550199", "text": "JOBS"})
    assert res1.status_code == 200
    assert "Jobs:" in res1.text

    res2 = client.post("/api/v1/sms/inbound", json={"from": "+12025550199", "text": "JOBS"})
    assert res2.status_code == 200
    assert "Jobs:" in res2.text
