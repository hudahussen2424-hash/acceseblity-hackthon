"""Small SQLite backed escalation API and tutor queue."""
from __future__ import annotations

import base64
import binascii
import hashlib
import json
import os
import re
import sqlite3
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse, PlainTextResponse
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

ETHIOPIC_RANGE = re.compile(r"[\u1200-\u137F]")

SECTION_SHORT_CODES = {
    "what-is-shaping-the-future-of-va-work": "Course s1",
    "artificial-intelligence-and-the-future-of-va-work": "Course s2",
    "what-clients-are-likely-to-value-more-and-more": "Course s3",
    "what-this-means-for-aspiring-virtual-assistants": "Course s4",
    "so-is-the-future-of-va-promising": "Course s5",
}


JOBS_FILE = ROOT.parent / "demo" / "data" / "jobs.json"


def get_job_titles(lang: str = "en", limit: int = 3) -> list[str]:
    if JOBS_FILE.exists():
        try:
            data = json.loads(JOBS_FILE.read_text(encoding="utf-8"))
            if isinstance(data, list):
                titles = []
                for item in data:
                    if isinstance(item, dict) and item.get("title"):
                        titles.append(str(item["title"]))
                    if len(titles) == limit:
                        break
                if titles:
                    return titles
        except Exception:
            pass

    with connect() as db:
        rows = db.execute("SELECT title_en, title_am FROM jobs LIMIT ?", (limit,)).fetchall()
        if rows:
            return [row["title_am"] if lang == "am" else row["title_en"] for row in rows]

    return ["Executive VA", "Social Media Assistant", "Customer Support VA"]


def hash_phone(phone: str | None) -> str:
    if not phone:
        return ""
    normalized = re.sub(r"[^\d]", "", str(phone))
    if not normalized:
        normalized = str(phone).strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    if not phone:
        return ""
    normalized = re.sub(r"[^\d]", "", str(phone))
    if not normalized:
        normalized = str(phone).strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def detect_language(text: str) -> str:
    return "am" if ETHIOPIC_RANGE.search(text) else "en"


def get_source_short_code(source: dict[str, Any], sections: list[dict[str, Any]]) -> str:
    url = str(source.get("url") or "")
    anchor = url.split("#")[-1] if "#" in url else ""
    if anchor in SECTION_SHORT_CODES:
        return SECTION_SHORT_CODES[anchor]

    match = re.search(r"(?:section|s)[-_]?(\d+)", url, re.IGNORECASE)
    if match:
        return f"Course s{match.group(1)}"

    for idx, s in enumerate(sections):
        if s.get("url") == url or s.get("id") == anchor:
            return f"Course s{idx + 1}"

    return "Course s1"


def format_sms_message(body: str, source_code: str | None = None) -> str:
    body = re.sub(r"\s+", " ", body).strip()
    suffix = f" ({source_code})" if source_code else ""
    budget = 160 - len(suffix)
    if budget <= 0:
        return (body + suffix)[:160]

    if len(body) <= budget:
        return f"{body}{suffix}"

    truncated = body[:budget].rstrip()
    last_space = truncated.rfind(" ")
    if last_space > 0:
        truncated = truncated[:last_space].rstrip()

    if len(truncated) + 3 <= budget:
        truncated = f"{truncated}..."

    result = f"{truncated}{suffix}"
    return result[:160]


def connect() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def initialize() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS escalations (
            id TEXT PRIMARY KEY, conversation TEXT NOT NULL, language TEXT NOT NULL,
            page TEXT NOT NULL, note TEXT NOT NULL, audio_json TEXT, reply TEXT, created_at TEXT NOT NULL,
            replied_at TEXT, status TEXT NOT NULL DEFAULT 'waiting'
        )""")
        columns = {row[1] for row in db.execute("PRAGMA table_info(escalations)")}
        if "audio_json" not in columns:
            db.execute("ALTER TABLE escalations ADD COLUMN audio_json TEXT")
        db.execute("""CREATE TABLE IF NOT EXISTS content_sections (
            id TEXT PRIMARY KEY, section_json TEXT NOT NULL
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS sms_alerts (
            phone_hash TEXT PRIMARY KEY,
            active INTEGER NOT NULL DEFAULT 1,
            updated_at TEXT NOT NULL
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            title_en TEXT NOT NULL,
            title_am TEXT NOT NULL
        )""")
        count_jobs = db.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
        if count_jobs == 0:
            db.executemany(
                "INSERT INTO jobs (id, title_en, title_am) VALUES (?, ?, ?)",
                [
                    ("1", "Executive VA", "አስፈፃሚ ቨርቹዋል ረዳት"),
                    ("2", "Social Media Assistant", "የማህበራዊ ሚዲያ ረዳት"),
                    ("3", "Customer Support VA", "የደንበኞች አገልግሎት ረዳት"),
                ],
            )
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


def save_escalation_record(
    conversation: list[dict[str, Any]], language: str, page: str, note: str, audio_json: str | None = None
) -> str:
    ticket_id = str(uuid4())
    created = datetime.now(timezone.utc).isoformat()
    with connect() as db:
        db.execute(
            "INSERT INTO escalations(id,conversation,language,page,note,audio_json,created_at) VALUES(?,?,?,?,?,?,?)",
            (ticket_id, json.dumps(conversation, ensure_ascii=False), language, page, note.strip(), audio_json, created),
        )
    return ticket_id


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


@app.post("/sms/inbound", response_class=PlainTextResponse)
async def sms_inbound(request: Request, background: BackgroundTasks) -> PlainTextResponse:
    try:
        payload = await request.json()
    except Exception:
        return PlainTextResponse("Send valid JSON with a text message.", status_code=400)

    if not isinstance(payload, dict):
        return PlainTextResponse("Send a JSON object with a text message.", status_code=400)

    raw_text = payload.get("text")
    if not isinstance(raw_text, str) or not raw_text.strip():
        return PlainTextResponse("Send a text message.", status_code=400)

    text = raw_text.strip()
    from_number = str(payload.get("from") or "").strip()
    phone_hash = hash_phone(from_number)
    lang = detect_language(text)
    cmd = text.upper()

    # Command: PERSON opens an escalation
    if cmd == "PERSON":
        ticket_id = save_escalation_record(
            conversation=[{"from": "user", "text": "PERSON"}],
            language=lang,
            page=f"sms:{phone_hash}" if phone_hash else "sms",
            note=f"SMS escalation from {phone_hash}" if phone_hash else "SMS escalation",
        )
        background.add_task(notify_webhook, ticket_id, {"page": f"sms:{phone_hash}" if phone_hash else "sms"})
        reply = (
            "የመምህር እርዳታ ተጠይቋል። መምህር በቅርቡ መልስ ይሰጥዎታል።"
            if lang == "am"
            else "A tutor will answer here. It may take until morning."
        )
        return PlainTextResponse(reply, media_type="text/plain")

    # Command: JOBS lists up to 3 job titles
    if cmd == "JOBS":
        job_titles = get_job_titles(lang=lang, limit=3)
        prefix = "ክፍት የሥራ ቦታዎች: " if lang == "am" else "Jobs: "
        reply = prefix + " ".join(f"{i+1}. {t}" for i, t in enumerate(job_titles))
        return PlainTextResponse(format_sms_message(reply), media_type="text/plain")

    # Command: ALERT ON / ALERT OFF / ALERT toggles job alerts for that number
    if cmd in ("ALERT ON", "ALERT OFF", "ALERT"):
        now_iso = datetime.now(timezone.utc).isoformat()
        with connect() as db:
            if cmd == "ALERT ON":
                active = 1
            elif cmd == "ALERT OFF":
                active = 0
            else:
                row = db.execute("SELECT active FROM sms_alerts WHERE phone_hash = ?", (phone_hash,)).fetchone()
                active = 0 if row and row["active"] == 1 else 1

            if phone_hash:
                db.execute(
                    "INSERT OR REPLACE INTO sms_alerts(phone_hash, active, updated_at) VALUES(?, ?, ?)",
                    (phone_hash, active, now_iso),
                )

        if active == 1:
            reply = "የሥራ ማሳወቂያ በርቷል።" if lang == "am" else "Job alerts turned on."
        else:
            reply = "የሥራ ማሳወቂያ ጠፍቷል።" if lang == "am" else "Job alerts turned off."
        return PlainTextResponse(reply, media_type="text/plain")

    # Normal question: run answer pipeline
    sections = indexed_sections()
    result = await answer_question(text, lang, sections)
    answer = result.get("answer", "")
    sources = result.get("sources", [])

    source_code = None
    if sources and answer not in (
        "I could not find this in the course.",
        "ይህንን በትምህርቱ ውስጥ ማግኘት አልቻልኩም።",
        "I can’t help with medical, legal, or immigration advice. Please talk to a tutor."
    ):
        source_code = get_source_short_code(sources[0], sections)

    formatted = format_sms_message(answer, source_code)
    return PlainTextResponse(formatted, media_type="text/plain")


def ticket_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "ticketId": row["id"], "conversation": json.loads(row["conversation"]),
        "language": row["language"], "page": row["page"], "note": row["note"],
        "reply": row["reply"], "status": row["status"], "createdAt": row["created_at"],
        "audio": json.loads(row["audio_json"]) if row["audio_json"] else None,
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
    audio = payload.get("audio")
    audio_json = None
    if audio is not None:
        if not isinstance(audio, dict) or not isinstance(audio.get("mimeType"), str) or not isinstance(audio.get("dataUrl"), str):
            plain_bad("Voice note must include its audio type and recording.")
        mime_type, data_url = audio["mimeType"], audio["dataUrl"]
        if not mime_type.startswith("audio/") or len(data_url) > 12_000_000 or not data_url.startswith(f"data:{mime_type};base64,"):
            plain_bad("Voice note format is not supported or is too large.")
        try:
            decoded_audio = base64.b64decode(data_url.split(",", 1)[1], validate=True)
        except (binascii.Error, ValueError):
            plain_bad("Voice note data is not valid.")
        if len(decoded_audio) > 8_000_000:
            plain_bad("Voice note must be smaller than 8 MB.")
        audio_json = json.dumps({"mimeType": mime_type, "dataUrl": data_url})
    ticket_id = save_escalation_record(conversation, language, page, note, audio_json)
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
