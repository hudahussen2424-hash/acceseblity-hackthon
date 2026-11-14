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

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("ESCALATIONS_DB", ROOT / "escalations.sqlite3"))


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
