# Learning Assistant & Course Escalations

A lightweight, accessible learning assistant and tutor escalation system supporting multilingual search (English & Amharic), SMS integration, WebRTC screen assistance, and automated webhooks.

---

## Quick Start (Docker Compose)

Launch the entire stack with a single command:

```bash
docker compose up
```

This starts:
- **`web`**: Static web server (`nginx:alpine`) on [http://localhost:8080](http://localhost:8080) serving lesson pages (`/savanna`), interactive assistant module (`/module`), and demo content (`/demo`).
- **`api`**: FastAPI service on [http://localhost:8081](http://localhost:8081) with full CORS enabled for the web origin.

### Optional Profiles

- **Telegram Bot**:
  ```bash
  docker compose --profile telegram up
  ```
- **Local Ollama LLM**:
  ```bash
  docker compose --profile ollama up
  ```
- **Run Everything**:
  ```bash
  docker compose --profile telegram --profile ollama up
  ```

---

## Swagger UI & OpenAPI Schema

- **Interactive Swagger UI**: [http://localhost:8081/docs](http://localhost:8081/docs)
- **ReDoc Documentation**: [http://localhost:8081/redoc](http://localhost:8081/redoc)
- **OpenAPI JSON**: [http://localhost:8081/openapi.json](http://localhost:8081/openapi.json)

To export the OpenAPI specification to `openapi.yaml` in the repository root, run:

```bash
python scripts/export_openapi.py
```

---

## Webhook Integration & Request Catcher Testing

When an escalation ticket is created, the server automatically issues an HTTP POST to `WEBHOOK_URL` with the payload:

```json
{
  "event": "ticket.opened",
  "ticketId": "<uuid>",
  "at": "<iso-8601-timestamp>"
}
```

### Testing with Request Catcher

1. Open [https://requestcatcher.com](https://requestcatcher.com) and create a test endpoint (e.g. `https://savanna-test.requestcatcher.com`).
2. Add the URL to your `.env` file:
   ```env
   WEBHOOK_URL=https://savanna-test.requestcatcher.com/webhook
   ```
3. Create an escalation ticket via `curl`:
   ```bash
   curl -X POST http://localhost:8081/api/v1/escalations \
     -H "Content-Type: application/json" \
     -d '{
       "conversation": [{"from": "user", "text": "Can someone help me with Section 2?"}],
       "language": "en",
       "page": "savanna/pages/concept-with-navigation.html#artificial-intelligence-and-the-future-of-va-work",
       "note": "Question about AI tools"
     }'
   ```
4. Check your Request Catcher browser window. You will see an immediate POST request containing:
   ```json
   {
     "event": "ticket.opened",
     "ticketId": "c4b12345-6789-abcd-ef01-23456789abcd",
     "at": "2026-11-14T16:30:00.000000+00:00"
   }
   ```

---

## Endpoint Curl Reference

All endpoints return JSON (except `/sms/inbound` which returns plain-text SMS responses &le; 160 characters).

### 1. `POST /api/v1/ask`
Ask a question against course content with pure retrieval or optional AI fallback.

```bash
curl -X POST http://localhost:8081/api/v1/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How does artificial intelligence help virtual assistants?",
    "language": "en"
  }'
```

### 2. `GET /api/v1/content`
Retrieve all indexed course and job content sections.

```bash
curl -X GET http://localhost:8081/api/v1/content
```

### 3. `POST /api/v1/content`
Index or update course sections.

```bash
curl -X POST http://localhost:8081/api/v1/content \
  -H "Content-Type: application/json" \
  -d '[
    {
      "id": "what-is-shaping-the-future-of-va-work",
      "title": "What is Shaping the Future of VA Work",
      "url": "savanna/pages/concept-with-navigation.html#what-is-shaping-the-future-of-va-work",
      "text": {
        "en": "The world of virtual assistance is evolving quickly due to rapid technological change.",
        "am": "የቨርቹዋል ረዳትነት የሥራ መስክ በቴክኖሎጂ እድገት ምክንያት በፍጥነት እየተለወጠ ነው።"
      }
    }
  ]'
```

### 4. `POST /api/v1/escalations` (Status: 201 Created)
Create a learner escalation ticket for tutor follow-up.

```bash
curl -X POST http://localhost:8081/api/v1/escalations \
  -H "Content-Type: application/json" \
  -d '{
    "conversation": [
      {"from": "user", "text": "I do not understand asynchronous communication."}
    ],
    "language": "en",
    "page": "savanna/pages/concept-with-navigation.html#what-this-means-for-aspiring-virtual-assistants",
    "note": "Learner asked for clarification on communication practices"
  }'
```

### 5. `GET /api/v1/escalations`
List waiting tutor escalations (requires `X-Helper-Token`).

```bash
curl -X GET http://localhost:8081/api/v1/escalations \
  -H "X-Helper-Token: replace-with-a-long-random-token"
```

### 6. `GET /api/v1/escalations/{ticket_id}`
Get details and reply status for a specific ticket.

```bash
curl -X GET http://localhost:8081/api/v1/escalations/TICKET_ID_HERE
```

### 7. `POST /api/v1/escalations/{ticket_id}/reply`
Tutor submits a reply to an open escalation ticket.

```bash
curl -X POST http://localhost:8081/api/v1/escalations/TICKET_ID_HERE/reply \
  -H "Content-Type: application/json" \
  -H "X-Helper-Token: replace-with-a-long-random-token" \
  -d '{
    "text": "Hello! Asynchronous communication means sending messages without expecting an immediate reply, such as email or Slack."
  }'
```

### 8. `DELETE /api/v1/escalations/{ticket_id}`
Delete an escalation ticket once resolved.

```bash
curl -X DELETE http://localhost:8081/api/v1/escalations/TICKET_ID_HERE \
  -H "X-Helper-Token: replace-with-a-long-random-token"
```

### 9. `POST /api/v1/jobs/notify`
Broadcast a new job posting to subscribed learners via Telegram and SMS alerts.

```bash
curl -X POST http://localhost:8081/api/v1/jobs/notify \
  -H "Content-Type: application/json" \
  -H "X-Helper-Token: replace-with-a-long-random-token" \
  -d '{
    "job": {
      "id": "job-201",
      "title": "Executive VA",
      "location": "Addis Ababa",
      "url": "https://example.com/jobs/201",
      "description": "Calendar management and client correspondence.",
      "remote": true
    }
  }'
```

### 10. `POST /sms/inbound` (and `POST /api/v1/sms/inbound`)
Handles inbound mobile SMS messages, returning plain text &le; 160 characters.

#### Example A: English Question
```bash
curl -X POST http://localhost:8081/sms/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+12025550199",
    "text": "Can artificial intelligence draft routine emails?"
  }'
```
*Response (`text/plain` &le; 160 chars):*
```text
Rather than eliminating human assistants, artificial intelligence automates repetitive duties such as drafting routine emails... (Course s2)
```

#### Example B: Amharic Question
```bash
curl -X POST http://localhost:8081/sms/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+251911223344",
    "text": "አርቴፊሻል ኢንተለጀንስ የሰዎችን ሥራ ይተካል?"
  }'
```
*Response (`text/plain` &le; 160 chars):*
```text
አርቴፊሻል ኢንተለጀንስ ወይም ዘመናዊ የኮምፒውተር ፕሮግራሞች የቨርቹዋል ረዳቶችን የዕለት ተዕለት ሥራ እያቀለሉ ነው። እነዚህ የቴክኖሎጂ መሣሪያዎች ሰዎችን ሙሉ በሙሉ አያስቀሩም ወይም አይተኩም... (Course s2)
```

#### Example C: Tutor Escalation (`PERSON`)
```bash
curl -X POST http://localhost:8081/sms/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+251911223344",
    "text": "PERSON"
  }'
```
*Response:*
```text
A tutor will answer here. It may take until morning.
```

#### Example D: Job Listings (`JOBS`)
```bash
curl -X POST http://localhost:8081/sms/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+251911223344",
    "text": "JOBS"
  }'
```
*Response:*
```text
Jobs: 1. Executive VA 2. Social Media Assistant 3. Customer Support VA
```

#### Example E: Toggle Job Alerts (`ALERT ON` / `ALERT OFF`)
```bash
curl -X POST http://localhost:8081/sms/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+251911223344",
    "text": "ALERT ON"
  }'
```
*Response:*
```text
Job alerts turned on.
```

---

## How Real SMS Gateways Call `/sms/inbound`

Real-world SMS telecom aggregators (e.g. Africa's Talking, Twilio, Infobip, or local Ethio Telecom VAS partners) route inbound mobile SMS to web services:

1. **Webhook Registration**:
   Configure the gateway's Inbound SMS Callback URL to point to:
   ```text
   https://your-public-domain.com/sms/inbound
   ```
2. **Payload Delivery**:
   When a user sends an SMS to the designated shortcode, the aggregator delivers a JSON payload:
   ```json
   {
     "from": "+251911223344",
     "text": "What does a virtual assistant do?"
   }
   ```
   For providers sending `application/x-www-form-urlencoded` fields (`From` and `Body`), an API Gateway or lightweight reverse proxy adapts the fields to `"from"` and `"text"`.
3. **Synchronous Plain-Text Response**:
   The endpoint responds synchronously with `Content-Type: text/plain` bounded to 160 characters. The SMS gateway captures this response body and delivers it back to the handset as an immediate single-part SMS reply.
4. **Data Minimization & Privacy**:
   The service never stores raw phone numbers in the database. Phone numbers are hashed using SHA-256 for ticket reference and subscription tracking. When outbound alerts are enabled, numbers are encrypted at rest using Fernet symmetric encryption.

---

## Telegram Bot Integration

To connect the Telegram bot:
1. Contact [@BotFather](https://t.me/BotFather) on Telegram and create a new bot with `/newbot`.
2. Copy the bot token into `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
   ```
3. Run the bot using the Docker Compose telegram profile:
   ```bash
   docker compose --profile telegram up
   ```
The bot uses long polling (`getUpdates`) and requires no public domain or inbound ports.

---

## Screen Sharing & Android Support

Screen sharing is initiated only with explicit learner consent. On modern desktop browsers, `getDisplayMedia()` coordinates a peer-to-peer WebRTC connection.

**Android Chrome Notice:**
Android Chrome does not support native `getDisplayMedia()`. On Android Chrome, the assistant falls back to “Show my tutor where I am”, sending page URL, focused element details, headings, and an optional user-selected screenshot.

---

## Running Automated Tests

Run the full test suite (unit tests, API coverage, retrieval, and SMS validation):

```bash
# Python backend tests
python -m pytest tests/

# Node.js search algorithm unit tests
node --test tests/search.test.js
```
