# Hackthon

## Telegram Bot

Create a bot by opening [@BotFather](https://t.me/BotFather) in Telegram, sending `/newbot`, and following its prompts. Copy the token BotFather returns into a project-root `.env` file as `TELEGRAM_BOT_TOKEN=your-token`. Start the long-polling bot with `docker compose up --build`; it uses Telegram `getUpdates` and does not need a public server or webhook. Docker Compose requires the token and will not start the service without it.

---

## SMS Inbound Endpoint (`POST /sms/inbound`)

The learning assistant supports inbound SMS messaging for low-bandwidth learners via `POST /sms/inbound`.

### How a Real SMS Gateway Calls This Endpoint

Real-world SMS telecom aggregators (e.g., Africa's Talking, Twilio, Infobip, or local telco VAS gateways) receive inbound mobile-originated (MO) SMS messages from cellular networks and forward them to web applications via HTTP POST webhooks.

1. **Webhook Configuration**:
   In the gateway's portal (e.g., Africa's Talking SMS Callback URL or Twilio Webhook), configure the endpoint URL:
   ```text
   https://your-domain.example.com/sms/inbound
   ```

2. **Payload Forwarding**:
   When a learner texts the shortcode or phone number, the gateway translates the SMS into JSON:
   ```json
   {
     "from": "+251911223344",
     "text": "Can artificial intelligence draft routine emails?"
   }
   ```
   If using form-encoded gateways (e.g., standard Twilio `From` & `Body`), an API gateway middleware or reverse proxy maps `From` &rarr; `from` and `Body` &rarr; `text`.

3. **Direct Plain-Text Response**:
   The endpoint responds synchronously with `Content-Type: text/plain` containing **at most 160 characters**. This allows SMS gateways to immediately relay the HTTP response body back to the cellular network as a single-segment reply SMS without incurring multi-part concatenation fees.

4. **Privacy & Data Minimization**:
   The endpoint **never** stores the learner's raw phone number. Only an irreversible SHA-256 hash of the normalized phone number is stored in the database for managing subscription state (`sms_alerts`) and tutor escalation references (`escalations`).

---

### Special Commands

- **`PERSON`**: Opens an escalation ticket for a human tutor to follow up.
- **`JOBS`**: Returns up to 3 available virtual assistant job titles.
- **`ALERT ON` / `ALERT OFF`** (or **`ALERT`**): Toggles job alert SMS notifications for that phone number.

---

### 4 Curl Examples

#### 1. Question in English
Ask a question about the course in English. The response includes an answer snippet truncated at a word boundary and a short source reference (e.g., `Course s2`), strictly within 160 characters:

```bash
curl -X POST http://localhost:8000/sms/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+12025550199",
    "text": "Can artificial intelligence draft routine emails?"
  }'
```

**Example Response (`text/plain` &le; 160 chars):**
```text
Rather than eliminating human assistants, artificial intelligence automates repetitive duties such as drafting routine emails... (Course s2)
```

#### 2. Question in Amharic
Ask a question in Amharic script (Ethiopic Unicode). The system automatically detects Amharic, queries the Amharic course sections, and returns the response in Amharic:

```bash
curl -X POST http://localhost:8000/sms/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+251911223344",
    "text": "አርቴፊሻል ኢንተለጀንስ የሰዎችን ሥራ ይተካል?"
  }'
```

**Example Response (`text/plain` &le; 160 chars):**
```text
አርቴፊሻል ኢንተለጀንስ ወይም ዘመናዊ የኮምፒውተር ፕሮግራሞች የቨርቹዋል ረዳቶችን የዕለት ተዕለት ሥራ እያቀለሉ ነው። እነዚህ የቴክኖሎጂ መሣሪያዎች ሰዎችን ሙሉ በሙሉ አያስቀሩም ወይም አይተኩም... (Course s2)
```

#### 3. Human Escalation (`PERSON`)
Request human tutor support. An escalation record is created with the sender's phone hash, and a confirmation is returned:

```bash
curl -X POST http://localhost:8000/sms/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+251911223344",
    "text": "PERSON"
  }'
```

**Example Response (`text/plain`):**
```text
A tutor will answer here. It may take until morning.
```

#### 4. Job Listings (`JOBS`)
List up to 3 active job titles:

```bash
curl -X POST http://localhost:8000/sms/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+251911223344",
    "text": "JOBS"
  }'
```

**Example Response (`text/plain`):**
```text
Jobs: 1. Executive VA 2. Social Media Assistant 3. Customer Support VA
```
