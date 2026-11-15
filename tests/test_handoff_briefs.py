import json
import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from api import main as backend


def make_client(tmp_path, monkeypatch):
    monkeypatch.setattr(backend, "DB_PATH", tmp_path / "handoff-briefs.sqlite3")
    backend.initialize()
    monkeypatch.setenv("HELPER_TOKEN", "brief-helper-token")
    return TestClient(backend.app)


def test_sourced_multilingual_brief_keeps_conversation_and_excludes_private_fields(tmp_path, monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "none")
    client = make_client(tmp_path, monkeypatch)
    section = json.loads(
        (Path(__file__).parents[1] / "demo" / "data" / "content.json").read_text(encoding="utf-8")
    )[1]
    conversation = [{"role": "user", "text": section["titles"]["am"]}]
    response = client.post(
        "/api/v1/escalations",
        json={
            "conversation": conversation,
            "language": "am",
            "page": "https://learn.example.test/lesson?tracking=private#section",
            "note": "Private note that must not enter the brief.",
            "phone": "0912345678",
            "audio": {"mimeType": "audio/webm", "dataUrl": "data:audio/webm;base64,YQ=="},
        },
    )

    assert response.status_code == 201
    ticket_id = response.json()["ticketId"]
    helper_headers = {"X-Helper-Token": "brief-helper-token"}
    listed = client.get("/api/v1/escalations", headers=helper_headers)
    assert listed.status_code == 200
    ticket = next(entry for entry in listed.json() if entry["ticketId"] == ticket_id)
    brief = ticket["handoffBrief"]

    assert brief["version"] == 1
    assert brief["language"] == "am"
    assert brief["requestedPage"] == "https://learn.example.test/lesson"
    assert brief["reason"] == "learner_requested_person"
    assert brief["evidenceStatus"] == "available"
    assert brief["source"] == {"title": section["titles"]["am"], "url": section["url"]}
    assert section["text"]["am"][:30] in brief["summary"]
    assert ticket["conversation"] == conversation
    serialized_brief = json.dumps(brief, ensure_ascii=False)
    assert "0912345678" not in serialized_brief
    assert "Private note" not in serialized_brief
    assert "dataUrl" not in serialized_brief


def test_unsourced_question_has_explicit_unavailable_evidence(tmp_path, monkeypatch):
    monkeypatch.setenv("THRESHOLD", "1.1")
    client = make_client(tmp_path, monkeypatch)
    response = client.post(
        "/api/v1/escalations",
        json={
            "conversation": [
                {"role": "user", "text": "How many moons orbit an imaginary planet?"},
                {"role": "assistant", "text": "I could not find this in the course.", "answerStatus": "not_found"},
            ],
            "language": "en",
            "page": "/lesson?private=1#fragment",
        },
    )

    assert response.status_code == 201
    brief = client.get(
        f"/api/v1/helper/escalations/{response.json()['ticketId']}/brief",
        headers={"X-Helper-Token": "brief-helper-token"},
    ).json()
    assert brief["reason"] == "answer_not_found"
    assert brief["source"] is None
    assert brief["evidenceStatus"] == "unavailable"
    assert "No indexed course content" in brief["summary"]
    assert brief["requestedPage"] == "/lesson"


def test_helper_authorization_and_learner_ticket_responses_do_not_expose_brief(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    created = client.post(
        "/api/v1/escalations",
        json={
            "conversation": [],
            "language": "en",
            "page": "/lesson",
            "handoffReason": "answer_flagged_incorrect",
        },
    ).json()
    ticket_id, learner_token = created["ticketId"], created["accessToken"]
    brief_url = f"/api/v1/helper/escalations/{ticket_id}/brief"

    assert client.get(brief_url).status_code == 401
    assert client.get(brief_url, headers={"X-Learner-Token": learner_token}).status_code == 401
    assert client.get("/api/v1/escalations").status_code == 401
    learner_ticket = client.get(
        f"/api/v1/escalations/{ticket_id}",
        headers={"X-Learner-Token": learner_token},
    )
    assert learner_ticket.status_code == 200
    assert "handoffBrief" not in learner_ticket.json()
    export = client.get(
        f"/api/v1/escalations/{ticket_id}/data",
        headers={"X-Learner-Token": learner_token},
    )
    assert export.status_code == 200
    assert "handoffBrief" not in export.json()
    brief = client.get(brief_url, headers={"X-Helper-Token": "brief-helper-token"}).json()
    assert brief["reason"] == "answer_flagged_incorrect"


def test_escalation_rejects_malformed_conversation_and_handoff_reason(tmp_path, monkeypatch):
    client = make_client(tmp_path, monkeypatch)
    base = {"language": "en", "page": "/lesson"}
    invalid_payloads = [
        {"conversation": "not-a-list"},
        {"conversation": [{"role": "user", "text": None}]},
        {"conversation": [{"role": "user", "text": "x" * 4001}]},
        {"conversation": [], "handoffReason": "invented"},
        {"conversation": [], "handoffReason": []},
    ]

    for fields in invalid_payloads:
        response = client.post("/api/v1/escalations", json={**base, **fields})
        assert response.status_code == 400


def test_old_ticket_is_migrated_and_brief_regenerated(tmp_path, monkeypatch):
    database = tmp_path / "old-tickets.sqlite3"
    with sqlite3.connect(database) as db:
        db.execute(
            """CREATE TABLE escalations (
                id TEXT PRIMARY KEY, conversation TEXT NOT NULL, language TEXT NOT NULL,
                page TEXT NOT NULL, note TEXT NOT NULL, audio_json TEXT,
                type TEXT NOT NULL DEFAULT 'person', job_id TEXT, accommodation TEXT,
                screen_context_json TEXT, reply TEXT, created_at TEXT NOT NULL,
                replied_at TEXT, status TEXT NOT NULL DEFAULT 'waiting', phone TEXT
            )"""
        )
        db.execute(
            "INSERT INTO escalations(id,conversation,language,page,note,created_at) VALUES(?,?,?,?,?,?)",
            (
                "legacy-ticket",
                json.dumps([{"role": "user", "text": "What is virtual assistant work?"}]),
                "en",
                "/lesson",
                "",
                "2026-01-01T00:00:00+00:00",
            ),
        )
    monkeypatch.setattr(backend, "DB_PATH", database)
    monkeypatch.setenv("HELPER_TOKEN", "brief-helper-token")
    monkeypatch.setenv("TICKET_RETENTION_DAYS", "0")
    backend.initialize()

    with sqlite3.connect(database) as db:
        columns = {row[1] for row in db.execute("PRAGMA table_info(escalations)")}
    assert "handoff_brief_json" in columns

    response = TestClient(backend.app).get(
        "/api/v1/helper/escalations/legacy-ticket/brief",
        headers={"X-Helper-Token": "brief-helper-token"},
    )
    assert response.status_code == 200
    assert response.json()["version"] == 1
    with sqlite3.connect(database) as db:
        saved = db.execute(
            "SELECT handoff_brief_json FROM escalations WHERE id='legacy-ticket'"
        ).fetchone()[0]
    assert json.loads(saved)["version"] == 1
