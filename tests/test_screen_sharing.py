import base64

from fastapi.testclient import TestClient
import pytest

from api.main import app, initialize


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr("api.main.DB_PATH", tmp_path / "screen-sharing.sqlite3")
    monkeypatch.setenv("HELPER_TOKEN", "test-helper-token")
    monkeypatch.setattr("api.main.notify_webhook", lambda *_args: None)
    initialize()
    return TestClient(app)


def create_ticket(client, ticket_type, **extra):
    response = client.post("/api/v1/escalations", json={
        "type": ticket_type,
        "conversation": [{"text": "Please help me."}],
        "language": "en",
        "page": "https://example.test/lesson",
        **extra,
    })
    assert response.status_code == 201
    return response.json()["ticketId"]


def test_page_context_and_optional_screenshot_are_available_to_helper(client):
    image = base64.b64encode(b"small image payload").decode("ascii")
    context = {
        "pageUrl": "https://example.test/lesson",
        "focusedAccessibleName": "Continue",
        "focusedOuterHTML": '<button aria-label="Continue">Continue</button>',
        "headings": ["Lesson", "Practice"],
        "screenshot": {"mimeType": "image/png", "dataUrl": f"data:image/png;base64,{image}"},
    }

    ticket_id = create_ticket(client, "screen-context", screenContext=context)
    response = client.get("/api/v1/escalations", headers={"X-Helper-Token": "test-helper-token"})

    assert response.status_code == 200
    assert response.json()[0]["ticketId"] == ticket_id
    assert response.json()[0]["screenContext"] == context


@pytest.mark.parametrize("context, detail", [
    ({"pageUrl": "https://example.test", "focusedOuterHTML": "x" * 501}, "500 characters"),
    ({
        "pageUrl": "https://example.test",
        "screenshot": {"mimeType": "image/svg+xml", "dataUrl": "data:image/svg+xml;base64,PHN2Zy8+"},
    }, "supported image"),
])
def test_page_context_rejects_oversized_html_and_unsupported_images(client, context, detail):
    response = client.post("/api/v1/escalations", json={
        "type": "screen-context",
        "conversation": [],
        "language": "en",
        "page": "https://example.test",
        "screenContext": context,
    })

    assert response.status_code == 400
    assert detail in response.text


def test_page_context_rejects_screenshots_over_three_megabytes(client):
    image = base64.b64encode(b"x" * 3_000_001).decode("ascii")
    response = client.post("/api/v1/escalations", json={
        "type": "screen-context",
        "conversation": [],
        "language": "en",
        "page": "https://example.test",
        "screenContext": {
            "pageUrl": "https://example.test",
            "screenshot": {"mimeType": "image/png", "dataUrl": f"data:image/png;base64,{image}"},
        },
    })

    assert response.status_code == 400
    assert "smaller than 3 MB" in response.text


def test_screen_signal_requires_helper_for_offer_retrieval_and_answer_submission(client):
    ticket_id = create_ticket(client, "screen-share")
    url = f"/api/v1/escalations/{ticket_id}/signal"
    offer = "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n"

    assert client.post(url, json={"type": "offer", "sdp": offer}).status_code == 200
    assert client.get(url, params={"type": "offer"}).status_code == 401
    assert client.get(url, params={"type": "offer"}, headers={"X-Helper-Token": "test-helper-token"}).json()["sdp"] == offer.strip()
    assert client.post(url, json={"type": "answer", "sdp": offer}).status_code == 401
    answer_response = client.post(
        url,
        json={"type": "answer", "sdp": offer},
        headers={"X-Helper-Token": "test-helper-token"},
    )
    assert answer_response.status_code == 200
    assert client.get(url, params={"type": "answer"}).json()["sdp"] == offer.strip()

    assert client.delete(url).json() == {"deleted": True}
    assert client.get(url, params={"type": "answer"}).json()["sdp"] is None
