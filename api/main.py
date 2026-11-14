"""Small SQLite backed escalation API and tutor queue."""
from __future__ import annotations

import base64
import binascii
import hashlib
import json
import os
import re
import sqlite3
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

try:
    from cryptography.fernet import Fernet, InvalidToken
except ImportError:
    Fernet = None
    InvalidToken = Exception
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
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
root_env_file = ROOT.parent / ".env"
if root_env_file.exists():
    for env_line in root_env_file.read_text(encoding="utf-8").splitlines():
        env_line = env_line.strip()
        if env_line and not env_line.startswith("#") and "=" in env_line:
            env_key, env_value = env_line.split("=", 1)
            os.environ.setdefault(env_key.strip(), env_value.strip().strip('"\''))

DB_PATH = Path(os.getenv("ESCALATIONS_DB", ROOT / "escalations.sqlite3"))

app = FastAPI(
    title="Learning Assistant & Course Escalations API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS middleware for the web origin (e.g. http://localhost:8080) and all clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"detail": "Please check your request and send valid data."},
    )


ETHIOPIC_RANGE = re.compile(r"[\u1200-\u137F]")
SUPPORTED_LANGUAGES = {"en", "am", "om", "ti", "so", "ar"}

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


def normalize_ethiopian_phone(phone: str | None) -> str | None:
    """Normalize Ethiopian mobile forms 09..., 07..., +2519..., and +2517...."""
    if not isinstance(phone, str) or not phone.strip():
        return None
    compact = re.sub(r"[\s()\-]", "", phone)
    national = "0" + compact[4:] if compact.startswith("+251") else compact
    if re.fullmatch(r"09\d{8}", national):
        return "+251" + national[1:]
    if re.fullmatch(r"07\d{8}", national):
        return "+251" + national[1:]
    return None


def sms_cipher():
    key = os.getenv("SMS_ENCRYPTION_KEY", "").strip()
    if not key or Fernet is None:
        return None
    try:
        return Fernet(key.encode("ascii"))
    except (ValueError, UnicodeEncodeError):
        return None


def encrypt_sms_phone(phone: str) -> str | None:
    cipher = sms_cipher()
    return cipher.encrypt(phone.encode("utf-8")).decode("ascii") if cipher else None


def decrypt_sms_phone(ciphertext: str) -> str | None:
    cipher = sms_cipher()
    if not cipher:
        return None
    try:
        return cipher.decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError, UnicodeDecodeError):
        return None


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


def send_sms_job_alerts(body: str) -> dict[str, int]:
    sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_number = os.getenv("TWILIO_FROM_NUMBER", "").strip()
    if not (sid and auth_token and from_number):
        return {"sent": 0, "failed": 0, "skipped": 0}
    with connect() as db:
        subscribers = db.execute(
            "SELECT phone_ciphertext FROM sms_alerts WHERE active=1 AND phone_ciphertext IS NOT NULL"
        ).fetchall()
    sent = failed = skipped = 0
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    auth = base64.b64encode(f"{sid}:{auth_token}".encode("utf-8")).decode("ascii")
    for row in subscribers:
        phone = decrypt_sms_phone(row["phone_ciphertext"])
        if not phone:
            skipped += 1
            continue
        data = urllib.parse.urlencode({"To": phone, "From": from_number, "Body": format_sms_message(body)}).encode("utf-8")
        request = urllib.request.Request(url, data=data, headers={"Authorization": f"Basic {auth}", "Content-Type": "application/x-www-form-urlencoded"}, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=8) as response:
                if 200 <= response.status < 300:
                    sent += 1
                else:
                    failed += 1
        except Exception:
            failed += 1
    return {"sent": sent, "failed": failed, "skipped": skipped}


def connect() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def initialize() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS escalations (
            id TEXT PRIMARY KEY, conversation TEXT NOT NULL, language TEXT NOT NULL,
            page TEXT NOT NULL, note TEXT NOT NULL, audio_json TEXT, type TEXT NOT NULL DEFAULT 'person',
            job_id TEXT, accommodation TEXT, screen_context_json TEXT, reply TEXT, created_at TEXT NOT NULL,
            replied_at TEXT, status TEXT NOT NULL DEFAULT 'waiting', phone TEXT
        )""")
        columns = {row[1] for row in db.execute("PRAGMA table_info(escalations)")}
        if "audio_json" not in columns:
            db.execute("ALTER TABLE escalations ADD COLUMN audio_json TEXT")
        for column, definition in (
            ("type", "TEXT NOT NULL DEFAULT 'person'"),
            ("job_id", "TEXT"),
            ("accommodation", "TEXT"),
            ("screen_context_json", "TEXT"),
            ("phone", "TEXT"),
        ):
            if column not in columns:
                db.execute(f"ALTER TABLE escalations ADD COLUMN {column} {definition}")
        db.execute("""CREATE TABLE IF NOT EXISTS escalation_signals (
            ticket_id TEXT NOT NULL, signal_type TEXT NOT NULL, sdp TEXT NOT NULL,
            created_at TEXT NOT NULL, PRIMARY KEY(ticket_id, signal_type)
        )""")
        signal_expiry = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        db.execute("DELETE FROM escalation_signals WHERE created_at < ?", (signal_expiry,))
        db.execute("""CREATE TABLE IF NOT EXISTS content_sections (
            id TEXT PRIMARY KEY, section_json TEXT NOT NULL
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS sms_alerts (
            phone_hash TEXT PRIMARY KEY,
            active INTEGER NOT NULL DEFAULT 1,
            phone_ciphertext TEXT,
            updated_at TEXT NOT NULL
        )""")
        sms_columns = {row[1] for row in db.execute("PRAGMA table_info(sms_alerts)")}
        if "phone_ciphertext" not in sms_columns:
            db.execute("ALTER TABLE sms_alerts ADD COLUMN phone_ciphertext TEXT")
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
    expected = os.getenv("HELPER_TOKEN", "").strip()
    if expected and token != expected:
        raise HTTPException(status_code=401, detail="Enter a valid helper token.")


def plain_bad(message: str) -> None:
    raise HTTPException(status_code=400, detail=message)


def notify_webhook(ticket_id: str, at: str | None = None) -> None:
    url = os.getenv("WEBHOOK_URL", "").strip()
    if not url:
        return
    if not at:
        try:
            with connect() as db:
                row = db.execute("SELECT created_at FROM escalations WHERE id=?", (ticket_id,)).fetchone()
                at = row["created_at"] if row else datetime.now(timezone.utc).isoformat()
        except Exception:
            at = datetime.now(timezone.utc).isoformat()
    data = json.dumps({
        "event": "ticket.opened",
        "ticketId": ticket_id,
        "at": at,
    }).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "FastAPI-Webhook/1.0"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            pass
    except Exception:
        # A failed notification must not undo a saved learner ticket.
        pass


def indexed_sections() -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute("SELECT section_json FROM content_sections ORDER BY rowid").fetchall()
    sections = [json.loads(row["section_json"]) for row in rows]
    for section in sections:
        if isinstance(section, dict):
            section.setdefault("type", "lesson")
    try:
        jobs = json.loads(JOBS_FILE.read_text(encoding="utf-8")) if JOBS_FILE.exists() else []
    except (OSError, ValueError):
        jobs = []
    if isinstance(jobs, list):
        known = {item.get("id") for item in sections if isinstance(item, dict)}
        for job in jobs:
            if not isinstance(job, dict) or job.get("id") in known:
                continue
            accommodations = job.get("accommodations", [])
            details = [job.get("description", ""), "remote work" if job.get("remote") else "on site", job.get("location", ""), *accommodations]
            sections.append({
                **job,
                "type": "job",
                "text": {"en": ". ".join(str(value) for value in details if value),
                         "am": ". ".join(str(value) for value in details if value)},
            })
    return sections


def save_escalation_record(
    conversation: list[dict[str, Any]], language: str, page: str, note: str,
    audio_json: str | None = None, ticket_type: str = "person",
    job_id: str | None = None, accommodation: str | None = None,
    screen_context_json: str | None = None,
    created_at: str | None = None,
    phone: str | None = None,
) -> str:
    ticket_id = str(uuid4())
    created = created_at or datetime.now(timezone.utc).isoformat()
    with connect() as db:
        db.execute(
            "INSERT INTO escalations(id,conversation,language,page,note,audio_json,type,job_id,accommodation,screen_context_json,created_at,phone) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            (ticket_id, json.dumps(conversation, ensure_ascii=False), language, page, note.strip(), audio_json, ticket_type, job_id, accommodation, screen_context_json, created, phone),
        )
    return ticket_id


@app.post("/api/v1/content")
async def index_content(request: Request) -> dict[str, int]:
    try:
        payload = await request.json()
    except Exception:
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
        source_type = section.get("type", "lesson")
        if source_type not in ("lesson", "job"):
            plain_bad("Section type must be lesson or job.")
        normalized["type"] = source_type
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
    if language not in SUPPORTED_LANGUAGES:
        plain_bad("Language must be en, am, om, ti, so, or ar.")
    return await answer_question(question.strip(), language, indexed_sections())


@app.post("/api/v1/jobs/notify")
def notify_job(payload: dict[str, Any], x_helper_token: str | None = Header(default=None)) -> dict[str, Any]:
    helper_auth(x_helper_token)
    job = payload.get("job", payload)
    if not isinstance(job, dict):
        plain_bad("Send one job object.")
    for field in ("id", "title", "location", "url", "description"):
        if not isinstance(job.get(field), str) or not job[field].strip():
            plain_bad(f"Job needs a {field}.")
    if not isinstance(job.get("remote"), bool):
        plain_bad("Job remote must be true or false.")
    message = f"New test job: {job['title']} · {'Remote' if job['remote'] else 'On site'} · {job['location']} · {job['url']}"
    try:
        from . import telegram_bot
        telegram = telegram_bot.notify_job_subscribers(job)
    except Exception:
        telegram = {"sent": 0, "failed": 1}
    sms = send_sms_job_alerts(message)
    return {"telegram": telegram, "sms": sms}


@app.post("/sms/inbound", response_class=PlainTextResponse)
@app.post("/api/v1/sms/inbound", response_class=PlainTextResponse)
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
    normalized_phone = normalize_ethiopian_phone(from_number)
    stored_phone = normalized_phone or from_number
    phone_hash = hash_phone(stored_phone) if stored_phone else ""
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
        background.add_task(notify_webhook, ticket_id)
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
                    "INSERT OR REPLACE INTO sms_alerts(phone_hash, active, phone_ciphertext, updated_at) VALUES(?, ?, ?, ?)",
                    (phone_hash, active, encrypt_sms_phone(stored_phone) if active and stored_phone else None, now_iso),
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
        "type": row["type"], "jobId": row["job_id"], "accommodation": row["accommodation"],
        "screenContext": json.loads(row["screen_context_json"]) if row["screen_context_json"] else None,
        "phone": row["phone"],
    }


@app.post("/api/v1/escalations", status_code=201)
def create_escalation(payload: dict[str, Any], background: BackgroundTasks) -> dict[str, str]:
    conversation = payload.get("conversation", [])
    language, page, note = payload.get("language"), payload.get("page"), payload.get("note", "")
    if not isinstance(conversation, list) or len(conversation) > 200:
        plain_bad("Conversation must be a list of up to 200 messages.")
    if any(not isinstance(m, dict) or not isinstance(m.get("text"), str) for m in conversation):
        plain_bad("Each conversation message needs text.")
    if language not in SUPPORTED_LANGUAGES:
        plain_bad("Language must be en, am, om, ti, so, or ar.")
    if not isinstance(page, str) or not page or len(page) > 2048:
        plain_bad("Add the page address.")
    if not isinstance(note, str) or len(note) > 4000:
        plain_bad("The note must be 4000 characters or fewer.")
    raw_phone = payload.get("phone", "")
    if not isinstance(raw_phone, str):
        plain_bad("Phone number must be written as text.")
    normalized_phone = normalize_ethiopian_phone(raw_phone) if raw_phone.strip() else None
    if raw_phone.strip() and not normalized_phone:
        plain_bad("Use an Ethiopian mobile number starting with 09, 07, +2519, or +2517.")
    audio = payload.get("audio")
    ticket_type = payload.get("type", "person")
    job_id, accommodation = payload.get("jobId"), payload.get("accommodation")
    if ticket_type not in ("person", "accommodation", "screen-share", "screen-context"):
        plain_bad("Ticket type is not supported.")
    if ticket_type == "accommodation":
        if not isinstance(job_id, str) or not job_id.strip() or not isinstance(accommodation, str) or not accommodation.strip():
            plain_bad("Choose a job and the accommodation you need.")
    screen_context = payload.get("screenContext")
    screen_context_json = None
    if ticket_type == "screen-context":
        if not isinstance(screen_context, dict):
            plain_bad("Page context must be an object.")
        page_url = screen_context.get("pageUrl")
        accessible_name = screen_context.get("focusedAccessibleName", "")
        outer_html = screen_context.get("focusedOuterHTML", "")
        headings = screen_context.get("headings", [])
        if not isinstance(page_url, str) or len(page_url) > 2048:
            plain_bad("Page context needs a valid page URL.")
        if not isinstance(accessible_name, str) or len(accessible_name) > 500:
            plain_bad("Focused accessible name must be 500 characters or fewer.")
        if not isinstance(outer_html, str) or len(outer_html) > 500:
            plain_bad("Focused element HTML must be 500 characters or fewer.")
        if not isinstance(headings, list) or len(headings) > 20 or any(
            not isinstance(heading, str) or len(heading) > 300 for heading in headings
        ):
            plain_bad("Page headings must be a list of up to 20 short strings.")
        normalized_context: dict[str, Any] = {
            "pageUrl": page_url,
            "focusedAccessibleName": accessible_name,
            "focusedOuterHTML": outer_html,
            "headings": headings,
            "screenshot": None,
        }
        screenshot = screen_context.get("screenshot")
        if screenshot is not None:
            if (
                not isinstance(screenshot, dict)
                or screenshot.get("mimeType") not in {"image/jpeg", "image/png", "image/webp", "image/gif"}
                or not isinstance(screenshot.get("dataUrl"), str)
            ):
                plain_bad("Screenshot must be a supported image.")
            mime_type = screenshot["mimeType"]
            data_url = screenshot["dataUrl"]
            if len(data_url) > 4_100_000 or not data_url.startswith(f"data:{mime_type};base64,"):
                plain_bad("Screenshot must be smaller than 3 MB.")
            try:
                decoded_image = base64.b64decode(data_url.split(",", 1)[1], validate=True)
            except (binascii.Error, ValueError):
                plain_bad("Screenshot data is not valid.")
            if len(decoded_image) > 3_000_000:
                plain_bad("Screenshot must be smaller than 3 MB.")
            normalized_context["screenshot"] = {"mimeType": mime_type, "dataUrl": data_url}
        screen_context_json = json.dumps(normalized_context, ensure_ascii=False)
    elif screen_context is not None:
        plain_bad("Page context is only allowed on a screen-context ticket.")
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
    ticket_id = save_escalation_record(
        conversation, language, page, note, audio_json, ticket_type,
        job_id.strip() if isinstance(job_id, str) else None,
        accommodation.strip() if isinstance(accommodation, str) else None,
        screen_context_json,
        phone=normalized_phone,
    )
    background.add_task(notify_webhook, ticket_id)
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


@app.post("/api/v1/escalations/{ticket_id}/signal")
def post_escalation_signal(
    ticket_id: str,
    payload: dict[str, Any],
    x_helper_token: str | None = Header(default=None),
) -> dict[str, bool]:
    signal_type, sdp = payload.get("type"), payload.get("sdp")
    if signal_type not in ("offer", "answer"):
        plain_bad("Signal type must be offer or answer.")
    if signal_type == "answer":
        helper_auth(x_helper_token)
    if not isinstance(sdp, str) or not sdp.strip() or len(sdp) > 200_000:
        plain_bad("A valid WebRTC session description is required.")
    with connect() as db:
        ticket = db.execute(
            "SELECT type FROM escalations WHERE id=?", (ticket_id,)
        ).fetchone()
        if ticket is None:
            raise HTTPException(status_code=404, detail="We could not find that ticket.")
        if ticket["type"] != "screen-share":
            plain_bad("Screen signaling is only available for screen-share tickets.")
        db.execute(
            "INSERT INTO escalation_signals(ticket_id, signal_type, sdp, created_at) "
            "VALUES(?, ?, ?, ?) ON CONFLICT(ticket_id, signal_type) "
            "DO UPDATE SET sdp=excluded.sdp, created_at=excluded.created_at",
            (ticket_id, signal_type, sdp.strip(), datetime.now(timezone.utc).isoformat()),
        )
    return {"stored": True}


@app.get("/api/v1/escalations/{ticket_id}/signal")
def get_escalation_signal(
    ticket_id: str,
    signal_type: str = Query(alias="type"),
    x_helper_token: str | None = Header(default=None),
) -> dict[str, str | None]:
    if signal_type not in ("offer", "answer"):
        plain_bad("Signal type must be offer or answer.")
    if signal_type == "offer":
        helper_auth(x_helper_token)
    with connect() as db:
        ticket = db.execute(
            "SELECT type FROM escalations WHERE id=?", (ticket_id,)
        ).fetchone()
        if ticket is None:
            raise HTTPException(status_code=404, detail="We could not find that ticket.")
        row = db.execute(
            "SELECT sdp FROM escalation_signals WHERE ticket_id=? AND signal_type=?",
            (ticket_id, signal_type),
        ).fetchone()
    return {"type": signal_type, "sdp": row["sdp"] if row else None}


@app.delete("/api/v1/escalations/{ticket_id}/signal")
def delete_escalation_signal(ticket_id: str) -> dict[str, bool]:
    with connect() as db:
        ticket = db.execute(
            "SELECT id FROM escalations WHERE id=?", (ticket_id,)
        ).fetchone()
        if ticket is None:
            raise HTTPException(status_code=404, detail="We could not find that ticket.")
        db.execute("DELETE FROM escalation_signals WHERE ticket_id=?", (ticket_id,))
    return {"deleted": True}


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


static_dir = ROOT / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

module_dir = ROOT.parent / "module" if (ROOT.parent / "module").exists() else static_dir
app.mount("/module", StaticFiles(directory=module_dir), name="module")

demo_dir = ROOT.parent / "demo" if (ROOT.parent / "demo").exists() else static_dir
app.mount("/demo", StaticFiles(directory=demo_dir, html=True), name="demo")
