# db-assistant — Accessibility track

**Team members:** Not recorded in this repository; add the actual team names before submission.

**Co-designer:** No co-designer participant or test session is recorded; add the participant's name after the run.

## What it does (three sentences)

db-assistant is a framework-free web component that answers learner questions from course and job content and links to its sources. The FastAPI service provides retrieval, tutor escalations, SMS routes, and a helper inbox, with optional Telegram and Ollama Compose profiles. The demo includes assistant UI and course/job text packs for English, Amharic, Tigrinya, Afaan Oromo, and Somali, a partial Arabic pack, practice jobs, queued questions, and learner-started voice and screen-sharing tools.

## **Main task:** A learner asks about the course, follows a source link, requests tutor help, and returns to check the tutor's reply.

## Run it (docker compose up, then which address)

Copy `.env.example` to `.env`, replace the placeholder with a long random `HELPER_TOKEN`, and set `WEBHOOK_URL=` unless you have configured your own trusted endpoint. The example file contains a placeholder webhook URL. Then run:

```sh
docker compose up
```

- Open the lesson at [http://localhost:8080/](http://localhost:8080/).
- Open the API documentation at [http://localhost:8081/docs](http://localhost:8081/docs).
- Open the tutor inbox at [http://localhost:8081/helper](http://localhost:8081/helper) and enter the helper token.
- Check API process liveness at `/health/live` and database/course readiness at `/health/ready`; readiness returns HTTP 503 until the database is usable and course content is loaded.

Compose stores the API database at `/data/escalations.sqlite3` in the named `api-data` volume, shared with the optional Telegram worker. Container recreation preserves that volume; `docker compose down -v` deletes it. Back up the volume before using this with real learners. When running the API directly, the database defaults to `api/escalations.sqlite3`.

In Compose, Nginx serves the lesson and forwards `/api/` and `/sms/` requests to the API service, so the checked-in pages work without a per-page `api` attribute. When deploying the static pages separately, either set `api="https://your-api.example.org"` on `<db-assistant>` or configure the static host to proxy those routes. The helper inbox remains available directly from the API.

## Install, Level 1 (script tag, every attribute, every event)

Serve `module/` and `demo/` from your site, serve the FastAPI service, and add:

```html
<script src="/module/db-assistant.js" defer></script>
<db-assistant
  id="lesson-assistant"
  lang="en"
  api="https://api.example.org"
  content="/demo/data/content.json"
  theme="light"
  debug
></db-assistant>
```

The script has no required attributes other than `src`. The component accepts:

- `lang`: language code. The widget's native language selector offers English (`en`), Amharic (`am`), Tigrinya (`ti`), Afaan Oromo (`om`), Somali (`so`), and Arabic (`ar`). The first five have assistant locale packs and course/job text; Arabic remains partial. Tigrinya, Afaan Oromo, and Somali translations have not been reviewed by fluent speakers. If a pack cannot be loaded, the widget explicitly reports that it is showing English.
- `api`: API base URL without a trailing slash. If omitted, the current page's origin is used. Set this when the static site and API use different ports or domains.
- `content`: URL of a JSON array of content sections. If omitted, the module tries the repository demo content at `../demo/data/content.json` relative to the script URL.
- `theme`: `light` or `dark`; the default is `light`.
- `debug`: boolean attribute that shows matching scores when present. `?debug=1` in the page URL also enables score display.
- `id`: standard HTML ID; it distinguishes this widget's browser-local history and question queue from another instance. If omitted, the instance uses `default`.

The widget also reads these ordinary browser attributes as usual: `class`, `style`, `title`, and accessibility attributes. They are not additional component settings.

Listen for these bubbling, composed custom events on the element:

```js
const assistant = document.querySelector("#lesson-assistant");
assistant.addEventListener("db-assistant:ready", (event) => console.log(event.detail));
assistant.addEventListener("db-assistant:question", (event) => console.log(event.detail.text));
```

- `db-assistant:ready`: `{ lang, dir }` after a translation pack is applied.
- `db-assistant:open` and `db-assistant:close`: empty detail objects.
- `db-assistant:question`: `{ text }` for a learner-submitted question.
- `db-assistant:person`: empty detail object when the learner opens the tutor escalation flow.
- `db-assistant:error`: `{ code: "empty-question" }` when an empty question is submitted.
- `db-assistant:escalated`: `{ ticketId }` after a regular tutor ticket is created, or `{ ticketId, type: "accommodation" }` for an accommodation ticket.

There are no custom events for microphone or screen-sharing state. New locale additions must include all assistant strings and translated course/job text; add the code to `SUPPORTED_LANGUAGES` in `api/main.py` and the existing language selector only after its content is present.

## Install, Level 2 (link to openapi.yaml, one curl per call)

The checked-in schema is [`openapi.yaml`](./openapi.yaml). With Compose running, the live Swagger UI is at `http://localhost:8081/docs`. The examples below use a POSIX shell; replace the token and ticket ID. Helper endpoints fail closed with HTTP 503 until a non-empty `HELPER_TOKEN` is configured in `.env`.

```sh
API=http://localhost:8081
TOKEN=replace-with-your-helper-token
TICKET_ID=replace-with-ticket-id
LEARNER_TOKEN=returned-on-ticket-creation-and-stored-in-that-browser

# GET /api/v1/config (whether the configured provider requires learner consent)
curl -sS "$API/api/v1/config"

# POST /api/v1/ask (set externalAiConsent=true only after the learner opts in)
curl -sS -X POST "$API/api/v1/ask" -H 'Content-Type: application/json' \
  -d '{"question":"How does AI help virtual assistants?","language":"en","externalAiConsent":false}'

# GET /api/v1/content
curl -sS "$API/api/v1/content"

# POST /api/v1/content
curl -sS -X POST "$API/api/v1/content" -H 'Content-Type: application/json' \
  -d '[{"id":"sample","title":"Sample lesson","url":"/lesson#sample","text":{"en":"Sample text.","am":"የናሙና ጽሑፍ።"}}]'

# POST /api/v1/escalations (screen-share ticket; use its returned ID for the signal calls)
curl -sS -X POST "$API/api/v1/escalations" -H 'Content-Type: application/json' \
  -d '{"type":"screen-share","conversation":[{"text":"Please explain this lesson."}],"language":"en","page":"https://example.org/lesson","note":""}'

# GET /api/v1/escalations (waiting tickets; helper token)
curl -sS "$API/api/v1/escalations" -H "X-Helper-Token: $TOKEN"

# GET /api/v1/escalations/{ticket_id} (reply/status fields)
curl -sS "$API/api/v1/escalations/$TICKET_ID" -H "X-Learner-Token: $LEARNER_TOKEN"

# GET /api/v1/escalations/{ticket_id}/data (full learner export)
curl -sS "$API/api/v1/escalations/$TICKET_ID/data" -H "X-Learner-Token: $LEARNER_TOKEN"

# DELETE /api/v1/escalations/{ticket_id}/data (learner's own ticket and attachments)
curl -sS -X DELETE "$API/api/v1/escalations/$TICKET_ID/data" \
  -H "X-Learner-Token: $LEARNER_TOKEN"

# POST /api/v1/escalations/{ticket_id}/reply
curl -sS -X POST "$API/api/v1/escalations/$TICKET_ID/reply" \
  -H "X-Helper-Token: $TOKEN" -H 'Content-Type: application/json' \
  -d '{"text":"Please review the lesson example and try the practice question."}'

# DELETE /api/v1/escalations/{ticket_id} (helper token)
curl -sS -X DELETE "$API/api/v1/escalations/$TICKET_ID" -H "X-Helper-Token: $TOKEN"

# POST /api/v1/jobs/notify (helper token)
curl -sS -X POST "$API/api/v1/jobs/notify" \
  -H "X-Helper-Token: $TOKEN" -H 'Content-Type: application/json' \
  -d '{"job":{"id":"practice-1","title":"Test job","location":"Addis Ababa","url":"https://example.org/job","description":"Practice listing.","remote":true}}'

# POST /sms/inbound
curl -sS -X POST "$API/sms/inbound" -H 'Content-Type: application/json' \
  -d '{"from":"+251911223344","text":"JOBS"}'

# POST /api/v1/sms/inbound (alias of /sms/inbound)
curl -sS -X POST "$API/api/v1/sms/inbound" -H 'Content-Type: application/json' \
  -d '{"from":"+251911223344","text":"PERSON"}'

# POST /api/v1/escalations/{ticket_id}/signal with a learner-generated offer
curl -sS -X POST "$API/api/v1/escalations/$TICKET_ID/signal" \
  -H 'Content-Type: application/json' \
  -d '{"type":"offer","sdp":"PASTE_REAL_WEBRTC_OFFER_SDP_HERE"}'

# GET /api/v1/escalations/{ticket_id}/signal?type=offer (helper token)
curl -sS -G "$API/api/v1/escalations/$TICKET_ID/signal" \
  --data-urlencode 'type=offer' -H "X-Helper-Token: $TOKEN"

# POST /api/v1/escalations/{ticket_id}/signal with a helper-generated answer
curl -sS -X POST "$API/api/v1/escalations/$TICKET_ID/signal" \
  -H "X-Helper-Token: $TOKEN" -H 'Content-Type: application/json' \
  -d '{"type":"answer","sdp":"PASTE_REAL_WEBRTC_ANSWER_SDP_HERE"}'

# GET /api/v1/escalations/{ticket_id}/signal?type=answer
curl -sS -G "$API/api/v1/escalations/$TICKET_ID/signal" --data-urlencode 'type=answer'

# DELETE /api/v1/escalations/{ticket_id}/signal
curl -sS -X DELETE "$API/api/v1/escalations/$TICKET_ID/signal"
```

The screen-signal examples are request shapes only: replace the SDP placeholders with real descriptions generated by WebRTC. The browser and helper page normally perform these calls. The offer/answer route is a demo transport, not a general media relay.

Tutor tickets remain waiting until a helper sends a final reply. In the helper inbox, select **Send as an update and keep request open for follow-up** when the tutor is unavailable; the learner can check the ticket in chat and see the update without closing it. Learner-facing copy says tutors may be unavailable, including at 23:00, and that response times vary and are not guaranteed. The widget stores the most recent pending ticket ID locally so the learner can return to the same chat and check again. Telegram `/person` requests return a short reference that can be checked with `/status <reference>`.

Learners can flag an answer or source as unhelpful or incorrect. `POST /api/v1/answer-feedback` stores only the feedback category, reason, source URL, and timestamp; it deliberately does not store the learner's question or answer text. Helpers can review items in `/helper` using the configured helper token. Feedback currently has no automatic expiry, so operators should include its SQLite table in retention and backup reviews.

AI providers must return a JSON answer with `text` and `source_ids`. The API accepts the AI text only when it is an exact excerpt of a cited, retrieved section, and displays only links to sections containing that excerpt. Missing, unknown, or non-extractive answers fall back to the best retrieved course section. If the host selects `AI_PROVIDER=cloud`, learners see an optional consent checkbox; without consent the server uses retrieval only and does not call the cloud provider.

## Install, Level 3 (JobPosting JSON-LD; honest "how LTI would connect" section if not done)

[`savanna/pages/jobs.html`](./savanna/pages/jobs.html) generates its `JobPosting` JSON-LD from the same `demo/data/jobs.json` file used to render the eight fictional listings. The page labels them as test listings; they are not real vacancies. Replace the test values with verified job data before publishing.

LTI is not implemented: there is no LMS launch endpoint, OIDC flow, signed-token validation, or grade passback. A real LTI 1.3 connection would need an LMS-registered client, OIDC login/launch endpoints, validation of the signed launch JWT against the platform's keys, and a mapping from the validated course/user context to an app session. Add Assignment and Grade Services only if the product needs grade passback. Do not treat the current demo as an LTI tool.

Open Badges 3.0 is not implemented: the project does not issue, sign, or verify digital credentials.

## Languages, voice, and screen sharing

The web assistant offers English, Amharic, Tigrinya, Afaan Oromo, Somali, and Arabic. English, Amharic, Tigrinya, Afaan Oromo, and Somali have locale strings plus translated course sections and test-job text; Arabic remains partial and is not represented as a complete course translation. Tigrinya, Afaan Oromo, and Somali text is unreviewed and must not be described as fluent-speaker verified. The API accepts all six language codes, returns localized course/job source titles and content where present, and avoids English course-text fallback for Tigrinya, Afaan Oromo, and Somali. If a new-language course match is unavailable, the API returns a localized no-match response without a misleading source. Existing stored seed sections are backfilled with the new translations without replacing their existing English text.

The Telegram bot currently exposes only English and Amharic. SMS's demo endpoint detects English versus Ethiopic script as Amharic; it cannot reliably distinguish Tigrinya from Amharic or Latin-script Afaan Oromo/Somali. Do not claim those languages are supported on Telegram/SMS. `/sms/inbound` is a JSON demo route, not a production Twilio webhook adapter.

Voice input and synthesis are opt-in. The learner presses the microphone control to start; recognized words appear in the editable question field and are never submitted automatically. If speech recognition is unavailable or errors, the existing recording fallback can be used when secure-context microphone access and `MediaRecorder` are available; a recording is attached only when the learner submits a tutor request. Replies stay visible as text, and Listen starts only after activation. Requested browser language tags are `en-US`, `am-ET`, `ti-ET`, `om-ET`, `so-SO`, and `ar-SA`; setting a tag does not establish that the device provides recognition or a matching synthesis voice. A missing voice is reported while text remains usable. No physical device/browser/language combination is verified in this repository; use the [voice-device checklist](tests/manual/voice-device-checklist.md) to record actual runs.

Screen and page sharing require the learner's explicit consent and a separate action. On supported desktop browsers, the browser's capture picker starts `getDisplayMedia`; a visible sharing status and Stop control remain available, and streams/signaling are cleaned up on stop, browser-ended capture, or component removal. Android Chrome uses the page-context alternative rather than live capture. With consent, that sends the page URL, focused element accessible name and up to 500 characters of HTML, up to 20 headings, and only an optional screenshot the learner selects (up to 3 MB). Live video is not recorded or stored by the application. The checked-in WebRTC flow is demo-only direct peer connectivity with no configured STUN/TURN or relay; production requires HTTPS, appropriate ICE/STUN/TURN or relay configuration, and network testing for both peers. WebRTC may fail on restrictive networks.

To add another language, provide a complete locale map, translated course/job titles and content, localized refusal/no-match responses, and source-linked retrieval tests before exposing it in this selector. Keep text direction correct (only Arabic is RTL), test tutor-ticket metadata and offline assets, and record actual voice/device support separately.

## Verification commands

```sh
npm run build:module
npm run check:module-size
npm test
python -m pytest -q
npm run test:e2e
npm run test:axe
```

These automated checks do not establish native-speaker review, device/browser speech support, screen-sharing interoperability on physical devices, keyboard-only/screen-reader usability, an actual 200% browser zoom result, or WCAG conformance. The co-designer and real-device checks remain pending until someone performs and records them.

`npm run test:e2e` runs Playwright against a local static server and a local API configured with a test helper token and an isolated SQLite database. It verifies browser-to-API flows in that setup; it does not verify the Docker Compose/Nginx deployment, production HTTPS or hosting, external AI/SMS/Telegram delivery, real tutor availability, or behavior across real devices and networks. Some browser capabilities, including speech and WebRTC, are stubbed in automated cases. Treat a passing run as local integration evidence, not field or production validation.

## Offline and slow connection (what works, measured Slow 3G load time, size in KB)

After content has loaded, the widget can search its locally loaded sections if the API request fails. When the browser reports itself offline, submitted questions are kept in `localStorage` and retried after an `online` event. Chat history, content, translations, and that queue are also stored in browser `localStorage`; clearing site data removes those local copies. Offline answers are limited to content already available in the page or cache. Tutor tickets, live API calls, and WebRTC cannot be completed offline.

Compose serves the root `sw.js` entry point and `module/sw.js` caches the lesson page, assistant assets, translations, and course data. After one successful online visit and service-worker installation, the root lesson can be reloaded offline; the first visit and uncached pages/API actions still need a network connection. Playwright verifies cached reloads against the repository's local static server; also test on the target deployment and a low-cost Android phone before claiming field readiness.

Measured on 2026-11-14 using Chromium against the local static demo, with browser cache and `localStorage` cleared, the service worker bypassed, 400 ms round-trip latency, 400 Kbps up/down, and 4× CPU throttling: the page load event took 2.53 s and the assistant plus course content were ready in 3.24 s. The four measured subresources transferred 95,025 bytes (about 92.8 KiB), including response headers; the unminified assistant and search JavaScript files total 79,605 bytes (about 77.7 KiB). This run did not call the API and is not a hosted-network or 3,000-learner load test. The repeatable Lighthouse script is [`scripts/measure-slow3g.ps1`](./scripts/measure-slow3g.ps1); it needs Node/npm, Lighthouse, and Chrome.

The SMS formatter stays within one provider segment: at most 160 GSM-7 septets (extension characters count as two) or 70 UTF-16 code units for Unicode messages, including the optional source suffix. The test suite checks those limits and that job-alert links remain in the message. For outbound gateway delivery, configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, and `SMS_ENCRYPTION_KEY`. A learner first sends `ALERT` to see the configured sender and possible carrier charges, then sends `ALERT ON` followed by `ALERT YES` to opt in; `ALERT OFF` opts out. Call the helper-token-protected `/api/v1/jobs/notify` endpoint above to send an alert. The API posts an authenticated form-encoded request to Twilio's Messages API; automated tests mock and verify that HTTP call, not delivery to a real handset. `/sms/inbound` is a JSON demo route, not a production Twilio webhook adapter (it does not parse or verify Twilio signatures). SMS-created tutor requests return a short reference; `STATUS <reference>` from the same sender checks for an update or final reply. Carrier charges may apply to messages.

## Data and privacy (what is collected, where, how to see/export/delete, consent, voice and screen sharing off until started)

- Questions sent to the API include the question and language. The default `AI_PROVIDER=none` uses local retrieval. If `AI_PROVIDER=cloud` is configured, the question and matched course sections are sent to the configured HTTPS provider only after the learner checks the consent box; otherwise the API uses retrieval only. `AI_PROVIDER=local` sends them to the configured Ollama service.
- The widget stores chat messages, cached content/translations, and queued offline questions in browser `localStorage`, scoped by page path and widget ID. The widget sends the conversation to a tutor only when the learner selects the conversation-consent checkbox.
- The widget also stores the most recent pending tutor ticket ID locally so the learner can check for an interim update or final reply after returning to the same page. This is separate from sharing the conversation with a tutor.
- A tutor ticket is stored in SQLite with its conversation (if shared), page URL, note, language, status/reply, and optional phone number. Voice recordings are included only after the learner starts recording and submits the voice note. A page-context ticket stores the page URL, focused element name/HTML, headings, and only a screenshot the learner chooses to upload. Tickets and their attachments expire after `TICKET_RETENTION_DAYS` (90 days by default; `0` disables expiry); expired records are purged at startup and before tickets are listed, read, updated, or saved.
- Telegram chat IDs, selected bot language, alert subscriptions, and up to 50 recent bot messages per chat are stored in the same SQLite database. Telegram also receives messages sent through the Bot API. SMS alert subscriptions store a phone hash and, when `SMS_ENCRYPTION_KEY` is configured, an encrypted number; an optional Twilio integration sends opted-in alerts. A phone number entered on a tutor ticket is stored in that ticket's SQLite row.
- A configured `WEBHOOK_URL` receives a ticket-opened event with the ticket ID and timestamp, not the conversation text. Webhook operators may retain their own logs.
- Desktop screen capture begins only after the learner consents, clicks the button, and chooses a source in the browser. The application does not record or store the live video; temporary WebRTC signaling and its screen-share ticket are removed on stop when the API is reachable, and otherwise expire under ticket retention. Android Chrome uses page-context sharing instead of live capture; only a learner-selected screenshot is attached to that ticket.
- Microphone speech recognition/recording is off until the learner presses its control. Recognized text is left for review and is not sent automatically; a voice note is not sent until it is attached to a tutor request.

The assistant tells Android Chrome users: **“On Android Chrome, live screen sharing is unavailable; you can share page details and optionally upload a screenshot instead.”**

Use the helper inbox at `/helper` or the helper-token-protected `GET /api/v1/escalations` to view waiting tickets. When a browser-created tutor request is made, the learner receives a random private management token; the widget stores it in that browser's local storage and offers per-ticket JSON export and deletion. The API stores only a hash of the token. The token is a bearer credential: use HTTPS in deployment and keep the browser profile private. If browser site data is cleared or the token is lost, the learner can no longer export/delete that ticket through self-service; an operator can delete it in the helper inbox. SMS-created tickets can be checked with `STATUS <reference>` from the same sender, but do not have learner self-export or self-deletion and are covered by retention. The widget's **Clear this device's assistant data** action removes its local chat history, queued questions, cached content, and saved ticket keys; clear server tickets separately first if you need to keep self-service access. Deleting a record removes it from the live database, but SQLite pages, WAL files, and backups may retain old bytes until those files are compacted or their retention expires; set backup retention accordingly. SMS alerts can be turned off by texting `ALERT OFF`; Telegram job alerts can be turned off with `/alerts off`. Back up the Compose `api-data` volume before deployment.

## Cost to run (rough per month for 3,000 learners, and what works with zero budget)

The code has no required paid AI service: retrieval is the default, and Telegram is optional. A rough planning allowance for 3,000 registered learners is about US$20–80 per month for a small hosted Linux server, basic backup/storage, and a domain, assuming modest traffic and no paid AI. This is not a capacity quote: concurrent usage, media storage, backups, SMS volume, and any cloud model can increase it, and the repository has not been load-tested with 3,000 learners. Twilio SMS and cloud AI use are extra variable charges; local Ollama avoids per-request API fees but needs suitable compute and electricity.

For production, configure HTTPS and restrictive trusted origins, secrets from a secret manager, monitored `/health/ready`, encrypted off-host backups with tested restore procedures, and retention/deletion for both tutor tickets and feedback. The checked-in Telegram, JSON SMS route, direct WebRTC, webhook, and fictional job listings are demo integrations or optional adapters, not verified production delivery systems. The repository does not include a production deployment validation or capacity test.

With zero hosting budget, run Docker Compose on an existing computer for a demo, use retrieval with `AI_PROVIDER=none`, and omit SMS and cloud AI. That does not provide a reliable public service. Telegram's Bot API and the open-source components do not remove the cost of hosting or mobile data.

## Finished and not finished (honest)

Finished in code: the web component and retrieval API; English, Amharic, Tigrinya, Afaan Oromo, and Somali assistant locale/course/job text (new translations are not fluent-speaker reviewed); partial Arabic strings; tutor escalation and helper inbox with learner ticket export/deletion and configurable expiry; optional SMS, Telegram long polling, Ollama, webhooks, synchronized test-job JSON-LD, cloud-AI learner consent, and consent-started desktop and page-context sharing.

Not finished: LTI integration, a production WebRTC relay/STUN/TURN setup, a complete account-wide privacy/export workflow, Arabic course translation, fluent-speaker review of the new language content, and a measured capacity test for 3,000 learners. The accessibility gate is not complete: no co-designer, NVDA/TalkBack, sound-off, or real 200% zoom run is recorded. No low-cost Android field test, physical microphone/speech-engine combination, or native Amharic content review is recorded. Use the [accessibility co-designer checklist](tests/manual/accessibility-co-designer-checklist.md) and [voice device checklist](tests/manual/voice-device-checklist.md) to record actual results. The job postings are fictional test data.

## Libraries and their licences (list every library and licence)

These are the direct third-party dependencies declared in the repository manifests. `package-lock.json` pins the npm dependency tree; Python dependency versions are not lockfile-pinned.

- FastAPI — MIT License.
- Uvicorn (including its `standard` extras) — BSD 3-Clause License.
- `cryptography` — Apache License 2.0 or BSD 3-Clause License.
- HTTPX — BSD 3-Clause License.
- `ruamel.yaml` — MIT License.
- pytest (development/test dependency) — MIT License.
- `@axe-core/playwright` — Mozilla Public License 2.0.
- `@playwright/test` — Apache License 2.0.
- Terser (JavaScript build dependency) — BSD 2-Clause License.

The browser module otherwise uses native browser APIs and repository code. The Compose images (`python:3.12-slim`, `nginx:alpine`, and optional `ollama/ollama`) are separately licensed software distributions; check their image notices and installed-package manifests when preparing a production image.
