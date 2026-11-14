"""Small SQLite backed escalation API and tutor queue."""
from __future__ import annotations

import json
import os
import sqlite3
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .qa import answer_question

ROOT = Path(__file__).resolve().parent


def load_env_file() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"\''))


load_env_file()
DB_PATH = Path(os.getenv("ESCALATIONS_DB", ROOT / "escalations.sqlite3"))
app = FastAPI(title="Learning assistant escalations")


def connect() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def initialize() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS escalations (
            id TEXT PRIMARY KEY, conversation TEXT NOT NULL, language TEXT NOT NULL,
            page TEXT NOT NULL, note TEXT NOT NULL, reply TEXT, created_at TEXT NOT NULL,
            replied_at TEXT, status TEXT NOT NULL DEFAULT 'waiting'
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS content_sections (
            id TEXT PRIMARY KEY, section_json TEXT NOT NULL
        )""")
        count = db.execute("SELECT COUNT(*) FROM content_sections").fetchone()[0]
        seed_file = ROOT.parent / "demo" / "data" / "content.json"
        if count == 0 and seed_file.exists():
            try:
                sections = json.loads(seed_file.read_text(encoding="utf-8"))
                if isinstance(sections, list):
                    db.executemany(
                        "INSERT OR REPLACE INTO content_sections(id,section_json) VALUES(?,?)",
                        [(str(section.get("id", uuid4())), json.dumps(section, ensure_ascii=False))
                         for section in sections if isinstance(section, dict)],
                    )
            except (OSError, ValueError):
                pass


initialize()


def helper_auth(token: str | None) -> None:
    expected = os.getenv("HELPER_TOKEN", "")
    if not expected or token != expected:
        raise HTTPException(status_code=401, detail="Enter a valid helper token.")


def plain_bad(message: str) -> None:
    raise HTTPException(status_code=400, detail=message)


def notify_webhook(ticket_id: str, payload: dict[str, Any]) -> None:
    url = os.getenv("WEBHOOK_URL")
    if not url:
        return
    data = json.dumps({"ticketId": ticket_id, "event": "escalation.opened", "page": payload["page"]}).encode()
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        urllib.request.urlopen(request, timeout=5).close()
    except Exception:
        # A failed notification must not undo a saved learner ticket.
        pass


def indexed_sections() -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute("SELECT section_json FROM content_sections ORDER BY rowid").fetchall()
    return [json.loads(row["section_json"]) for row in rows]


@app.post("/api/v1/content")
async def index_content(request: Request) -> dict[str, int]:
    try:
        payload = await request.json()
    except ValueError:
        plain_bad("Send valid JSON course content.")
    sections = payload.get("sections") if isinstance(payload, dict) else payload
    if not isinstance(sections, list) or len(sections) > 5000:
        plain_bad("Send a list of up to 5000 course sections.")
    rows = []
    for section in sections:
        if not isinstance(section, dict):
            plain_bad("Each course section must be an object.")
        section_id = section.get("id")
        title, url, text = section.get("title"), section.get("url", ""), section.get("text")
        if not isinstance(section_id, str) or not section_id.strip():
            plain_bad("Each course section needs an id.")
        if not isinstance(title, str) or not title.strip() or not isinstance(url, str) or not url.strip():
            plain_bad("Each course section needs a title and a text URL.")
        if not isinstance(text, (str, dict)):
            plain_bad("Each course section needs text.")
        if isinstance(text, dict) and any(not isinstance(value, str) for value in text.values()):
            plain_bad("Translated course text must be words in each language field.")
        normalized = {"id": section_id.strip(), "title": title.strip(), "url": url, "text": text}
        rows.append((normalized["id"], json.dumps(normalized, ensure_ascii=False)))
    with connect() as db:
        db.executemany("INSERT OR REPLACE INTO content_sections(id,section_json) VALUES(?,?)", rows)
    return {"indexed": len(rows)}


@app.get("/api/v1/content")
def get_content() -> list[dict[str, Any]]:
    return indexed_sections()


@app.post("/api/v1/ask")
async def ask(payload: dict[str, Any]) -> dict[str, Any]:
    question, language = payload.get("question"), payload.get("language", "en")
    if not isinstance(question, str) or not question.strip() or len(question) > 4000:
        plain_bad("Write a question of 1 to 4000 characters.")
    if language not in ("en", "am"):
        plain_bad("Language must be en or am.")
    return await answer_question(question.strip(), language, indexed_sections())


def ticket_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "ticketId": row["id"], "conversation": json.loads(row["conversation"]),
        "language": row["language"], "page": row["page"], "note": row["note"],
        "reply": row["reply"], "status": row["status"], "createdAt": row["created_at"],
    }


@app.post("/api/v1/escalations", status_code=201)
def create_escalation(payload: dict[str, Any], background: BackgroundTasks) -> dict[str, str]:
    conversation = payload.get("conversation", [])
    language, page, note = payload.get("language"), payload.get("page"), payload.get("note", "")
    if not isinstance(conversation, list) or len(conversation) > 200:
        plain_bad("Conversation must be a list of up to 200 messages.")
    if any(not isinstance(m, dict) or not isinstance(m.get("text"), str) for m in conversation):
        plain_bad("Each conversation message needs text.")
    if language not in ("en", "am"):
        plain_bad("Language must be en or am.")
    if not isinstance(page, str) or not page or len(page) > 2048:
        plain_bad("Add the page address.")
    if not isinstance(note, str) or len(note) > 4000:
        plain_bad("The note must be 4000 characters or fewer.")
    ticket_id = str(uuid4())
    created = datetime.now(timezone.utc).isoformat()
    with connect() as db:
        db.execute("INSERT INTO escalations(id,conversation,language,page,note,created_at) VALUES(?,?,?,?,?,?)",
                   (ticket_id, json.dumps(conversation, ensure_ascii=False), language, page, note.strip(), created))
    background.add_task(notify_webhook, ticket_id, {"page": page})
    return {"ticketId": ticket_id}


@app.get("/api/v1/escalations")
def list_waiting(x_helper_token: str | None = Header(default=None)) -> list[dict[str, Any]]:
    helper_auth(x_helper_token)
    with connect() as db:
        rows = db.execute("SELECT * FROM escalations WHERE status='waiting' ORDER BY created_at").fetchall()
    return [ticket_dict(row) for row in rows]


@app.get("/api/v1/escalations/{ticket_id}")
def get_escalation(ticket_id: str) -> dict[str, Any]:
    with connect() as db:
        row = db.execute("SELECT * FROM escalations WHERE id=?", (ticket_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="We could not find that ticket.")
    result = ticket_dict(row)
    # Learner polling only needs the reply and status; helper data stays private.
    return {"ticketId": result["ticketId"], "reply": result["reply"], "status": result["status"], "language": result["language"]}


@app.post("/api/v1/escalations/{ticket_id}/reply")
def reply(ticket_id: str, payload: dict[str, Any], x_helper_token: str | None = Header(default=None)) -> dict[str, str]:
    helper_auth(x_helper_token)
    text = payload.get("text")
    if not isinstance(text, str) or not text.strip() or len(text) > 8000:
        plain_bad("Write a reply of 1 to 8000 characters.")
    with connect() as db:
        cursor = db.execute("UPDATE escalations SET reply=?, replied_at=?, status='answered' WHERE id=?",
                            (text.strip(), datetime.now(timezone.utc).isoformat(), ticket_id))
    if not cursor.rowcount:
        raise HTTPException(status_code=404, detail="We could not find that ticket.")
    return {"message": "Reply saved."}


@app.delete("/api/v1/escalations/{ticket_id}")
def delete_escalation(ticket_id: str, x_helper_token: str | None = Header(default=None)) -> dict[str, str]:
    helper_auth(x_helper_token)
    with connect() as db:
        cursor = db.execute("DELETE FROM escalations WHERE id=?", (ticket_id,))
    if not cursor.rowcount:
        raise HTTPException(status_code=404, detail="We could not find that ticket.")
    return {"message": "Ticket deleted."}


@app.get("/helper", include_in_schema=False)
def helper_page() -> FileResponse:
    return FileResponse(ROOT / "static" / "helper.html")


app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")
app.mount("/module", StaticFiles(directory=ROOT.parent / "module"), name="module")
app.mount("/demo", StaticFiles(directory=ROOT.parent / "demo", html=True), name="demo")
