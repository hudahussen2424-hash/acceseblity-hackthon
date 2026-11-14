"""Tests for the SMS inbound endpoint (POST /sms/inbound)."""
import hashlib
import json
import sqlite3
from fastapi.testclient import TestClient
import pytest

from api.main import app, DB_PATH, connect, format_sms_message, hash_phone, normalize_ethiopian_phone


@pytest.fixture(autouse=True)
def setup_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_escalations.sqlite3"
    monkeypatch.setattr("api.main.DB_PATH", test_db)
    from api.main import initialize
    initialize()
    yield test_db


@pytest.fixture
def client():
    return TestClient(app)


def test_sms_inbound_missing_text_returns_400(client):
    res = client.post("/sms/inbound", json={"from": "+251911223344"})
    assert res.status_code == 400
    assert "Send a text message." in res.text

    res_empty = client.post("/sms/inbound", json={"from": "+251911223344", "text": "   "})
    assert res_empty.status_code == 400
    assert "Send a text message." in res_empty.text


def test_sms_inbound_english_question(client):
    res = client.post("/sms/inbound", json={"from": "+12025550199", "text": "Can artificial intelligence draft emails for virtual assistants?"})
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/plain")
    assert len(res.text) <= 160
    assert "Course s2" in res.text


def test_sms_inbound_amharic_question(client):
    res = client.post("/sms/inbound", json={"from": "+251911000000", "text": "አርቴፊሻል ኢንተለጀንስ የሰዎችን ሥራ ይተካል?"})
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/plain")
    assert len(res.text) <= 160
    assert "Course s2" in res.text


def test_sms_inbound_person_command(client):
    phone = "+251911123456"
    expected_hash = hash_phone(phone)

    res = client.post("/sms/inbound", json={"from": phone, "text": "PERSON"})
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/plain")
    assert len(res.text) <= 160
    assert "tutor will answer here" in res.text

    # Verify that raw phone number is NEVER stored; only phone hash
    with connect() as db:
        row = db.execute("SELECT * FROM escalations ORDER BY created_at DESC LIMIT 1").fetchone()
        assert row is not None
        assert phone not in row["page"]
        assert phone not in row["note"]
        assert phone not in row["conversation"]
        assert expected_hash in row["note"] or expected_hash in row["page"]


def test_sms_inbound_jobs_command(client):
    res_en = client.post("/sms/inbound", json={"from": "+12025550123", "text": "JOBS"})
    assert res_en.status_code == 200
    assert res_en.headers["content-type"].startswith("text/plain")
    assert len(res_en.text) <= 160
    assert "Jobs:" in res_en.text
    assert "1." in res_en.text and "2." in res_en.text and "3." in res_en.text
    assert "Inbox Support Assistant" in res_en.text or "Executive VA" in res_en.text

    res_am = client.post("/sms/inbound", json={"from": "+251911111111", "text": "ክፍት JOBS"})
    assert res_am.status_code == 200
    assert len(res_am.text) <= 160


def test_sms_inbound_alert_toggle(client):
    phone = "+251922334455"
    p_hash = hash_phone(phone)

    # 1. Turn ON
    res_on = client.post("/sms/inbound", json={"from": phone, "text": "ALERT ON"})
    assert res_on.status_code == 200
    assert "Job alerts turned on." in res_on.text
    assert len(res_on.text) <= 160

    with connect() as db:
        row = db.execute("SELECT * FROM sms_alerts WHERE phone_hash = ?", (p_hash,)).fetchone()
        assert row is not None
        assert row["active"] == 1

    # 2. Turn OFF
    res_off = client.post("/sms/inbound", json={"from": phone, "text": "ALERT OFF"})
    assert res_off.status_code == 200
    assert "Job alerts turned off." in res_off.text
    assert len(res_off.text) <= 160

    with connect() as db:
        row = db.execute("SELECT * FROM sms_alerts WHERE phone_hash = ?", (p_hash,)).fetchone()
        assert row is not None
        assert row["active"] == 0


def test_sms_truncation_at_word_boundary():
    long_answer = "This is a very long text explanation about virtual assistant work and artificial intelligence that exceeds standard SMS 160 characters length limit easily and needs clean word boundary truncation."
    formatted = format_sms_message(long_answer, "Course s2")
    assert len(formatted) <= 160
    assert formatted.endswith("(Course s2)")
    # Must not truncate mid-word
    assert not formatted.endswith("wor... (Course s2)")


@pytest.mark.parametrize(("entered", "expected"), [
    ("0911223344", "+251911223344"),
    ("0711223344", "+251711223344"),
    ("+251 9 1122 3344", "+251911223344"),
    ("+251711223344", "+251711223344"),
])
def test_ethiopian_phone_normalization(entered, expected):
    assert normalize_ethiopian_phone(entered) == expected


@pytest.mark.parametrize(("entered",), [("09112233",), ("0611223344",), ("+251811223344",)])
def test_rejects_unsupported_ethiopian_phone_shapes(entered):
    assert normalize_ethiopian_phone(entered) is None


def test_sms_alert_subscription_hash_uses_canonical_ethiopian_number(client):
    national = client.post("/sms/inbound", json={"from": "0911223344", "text": "ALERT ON"})
    international = client.post("/sms/inbound", json={"from": "+251911223344", "text": "ALERT ON"})
    assert national.status_code == international.status_code == 200
    canonical_hash = hash_phone("+251911223344")
    with connect() as db:
        rows = db.execute("SELECT phone_hash FROM sms_alerts WHERE phone_hash=?", (canonical_hash,)).fetchall()
    assert len(rows) == 1


def test_escalation_stores_canonical_ethiopian_phone(client):
    response = client.post("/api/v1/escalations", json={
        "conversation": [], "language": "en", "page": "http://localhost/lesson",
        "note": "", "phone": "0711223344"
    })
    assert response.status_code == 201
    with connect() as db:
        row = db.execute("SELECT phone FROM escalations WHERE id=?", (response.json()["ticketId"],)).fetchone()
    assert row["phone"] == "+251711223344"
