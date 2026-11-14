# db-assistant — Accessibility track

**Team members:** [TEAM MEMBERS]  
**Co-designer:** [CO-DESIGNER]

## What it does (three sentences)

db-assistant is a framework-free web component that answers learner questions from course and job content and links to its sources. The FastAPI service provides retrieval, tutor escalations, SMS routes, and a helper inbox, with optional Telegram and Ollama Compose profiles. The demo has full English and Amharic UI packs, partial Arabic and Oromo packs, practice jobs, queued questions, and learner-started voice and screen-sharing tools.

## The main task we tested (one sentence: [PASTE MY MAIN-TASK SENTENCE])

[PASTE MY MAIN-TASK SENTENCE]

## Run it (docker compose up, then which address)

Copy `.env.example` to `.env`, replace the placeholder with a long random `HELPER_TOKEN`, and set `WEBHOOK_URL=` unless you have configured your own trusted endpoint. The example file contains a placeholder webhook URL. Then run:

```sh
docker compose up
```

- Open the lesson at [http://localhost:8080/](http://localhost:8080/).
- Open the API documentation at [http://localhost:8081/docs](http://localhost:8081/docs).
- Open the tutor inbox at [http://localhost:8081/helper](http://localhost:8081/helper) and enter the helper token.

The database defaults to `api/escalations.sqlite3` on the host when run directly. In the Compose container it is at `/app/api/escalations.sqlite3`; Compose does not mount a persistent volume for it, so recreating the API container can lose stored records. Add a persistent volume and backups before using this for real learners.

The checked-in demo pages do not set the component's `api` attribute. The widget therefore tries the page's origin (`localhost:8080`) for API requests: local content search can still work, but API-backed tickets, tutor replies, and screen-sharing signaling need `api="http://localhost:8081"` as shown below. The helper inbox is served by the API independently.

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

- `lang`: language code. English (`en`) and Amharic (`am`) have full interface packs; Arabic (`ar`) and Oromo (`om`) packs are partial. The language buttons in the widget switch between English and Amharic.
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

There are no custom events for microphone or screen-sharing state. Add a locale by creating `module/i18n/<code>.json` with the full `strings` map, adding translations to the course data, adding the code to `SUPPORTED_LANGUAGES` in `api/main.py`, and exposing it in the widget's language controls if learners should be able to select it.

## Install, Level 2 (link to openapi.yaml, one curl per call)

The checked-in schema is [`openapi.yaml`](./openapi.yaml). With Compose running, the live Swagger UI is at `http://localhost:8081/docs`. The examples below use a POSIX shell; replace the token and ticket ID. Set `HELPER_TOKEN` in `.env`: when that environment value is empty, the current API helper check does not enforce a token.

```sh
API=http://localhost:8081
TOKEN=replace-with-your-helper-token
TICKET_ID=replace-with-ticket-id

# POST /api/v1/ask
curl -sS -X POST "$API/api/v1/ask" -H 'Content-Type: application/json' \
  -d '{"question":"How does AI help virtual assistants?","language":"en"}'

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
curl -sS "$API/api/v1/escalations/$TICKET_ID"

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

## Install, Level 3 (JobPosting JSON-LD; honest "how LTI would connect" section if not done)

[`savanna/pages/jobs.html`](./savanna/pages/jobs.html) contains a static `application/ld+json` graph with eight fictional `JobPosting` examples. The page labels them as test listings; their `.example.test` URLs are not real vacancies. Replace the test values with verified job data before publishing. The JSON-LD block and the separately loaded `demo/data/jobs.json` are not automatically synchronized.

LTI is not implemented: there is no LMS launch endpoint, OIDC flow, signed-token validation, or grade passback. A real LTI 1.3 connection would need an LMS-registered client, OIDC login/launch endpoints, validation of the signed launch JWT against the platform's keys, and a mapping from the validated course/user context to an app session. Add Assignment and Grade Services only if the product needs grade passback. Do not treat the current demo as an LTI tool.

## Languages (and how to add one)

The interface has complete English and Amharic packs. Arabic and Oromo files currently contain only a small subset of translated strings and fall back to English for missing strings. The course data in `demo/data/content.json` has English and Amharic text. The API accepts `en`, `am`, `om`, `ti`, `so`, and `ar`; accepting a language code does not mean the interface and course content are fully translated. The Telegram bot currently supports English and Amharic.

To add a language, complete a new `module/i18n/<code>.json` pack, translate course sections and relevant job content, add the code to `SUPPORTED_LANGUAGES` in `api/main.py`, and add a language control if it should be selectable. Test text direction, answer sources, validation errors, helper tickets, and speech behavior. The bot's command handling must also be updated separately if the new language is needed there.

## Offline and slow connection (what works, measured Slow 3G load time, size in KB)

After content has loaded, the widget can search its locally loaded sections if the API request fails. When the browser reports itself offline, submitted questions are kept in `localStorage` and retried after an `online` event. Chat history, content, translations, and that queue are also stored in browser `localStorage`; clearing site data removes those local copies. Offline answers are limited to content already available in the page or cache. Tutor tickets, live API calls, and WebRTC cannot be completed offline.

There is a service-worker cache in `sw.js` and `module/sw.js`. It caches static assets when the root worker is served, but the current Compose `web` service does not mount the repository's root `sw.js`; therefore offline reload/cache behavior is not guaranteed with the Compose setup. The first page load also needs a network connection.

Measured on 2026-11-14 using Chromium against the local static demo, with browser cache and `localStorage` cleared, the service worker bypassed, 400 ms round-trip latency, 400 Kbps up/down, and 4× CPU throttling: the page load event took 2.53 s and the assistant plus course content were ready in 3.24 s. The four measured subresources transferred 95,025 bytes (about 92.8 KiB), including response headers; the unminified assistant and search JavaScript files total 79,605 bytes (about 77.7 KiB). This run did not call the API and is not a hosted-network or 3,000-learner load test. The repeatable Lighthouse script is [`scripts/measure-slow3g.ps1`](./scripts/measure-slow3g.ps1); it needs Node/npm, Lighthouse, and Chrome.

## Data and privacy (what is collected, where, how to see/export/delete, consent, voice and screen sharing off until started)

- Questions sent to the API include the question and language. The default `AI_PROVIDER=none` uses local retrieval. If `AI_PROVIDER=cloud` is configured, the question and matched course sections are sent to the configured HTTPS provider; `AI_PROVIDER=local` sends them to the configured Ollama service.
- The widget stores chat messages, cached content/translations, and queued offline questions in browser `localStorage`, scoped by page path and widget ID. The widget sends the conversation to a tutor only when the learner selects the conversation-consent checkbox.
- A tutor ticket is stored in SQLite with its conversation (if shared), page URL, note, language, status/reply, and optional phone number. Voice recordings are included only after the learner starts recording and submits the voice note. A page-context ticket stores the page URL, focused element name/HTML, headings, and only a screenshot the learner chooses to upload. These ticket records have no automatic expiry.
- Telegram chat IDs, selected bot language, alert subscriptions, and up to 50 recent bot messages per chat are stored in the same SQLite database. Telegram also receives messages sent through the Bot API. SMS alert subscriptions store a phone hash and, when `SMS_ENCRYPTION_KEY` is configured, an encrypted number; an optional Twilio integration sends opted-in alerts. A phone number entered on a tutor ticket is stored in that ticket's SQLite row.
- A configured `WEBHOOK_URL` receives a ticket-opened event with the ticket ID and timestamp, not the conversation text. Webhook operators may retain their own logs.
- Desktop screen capture begins only after the learner consents, clicks the button, and chooses a source in the browser. The video stream is not recorded or stored by the app; temporary WebRTC offer/answer descriptions are stored in SQLite during signaling and are removed on stop/connection cleanup. Android Chrome uses page-context sharing instead of live capture; the optional screenshot is stored with the ticket.
- Microphone speech recognition/recording is off until the learner presses its control. A voice note is not sent until it is attached to a tutor request.

Use this limitation copy: **“On Android Chrome, live screen sharing is unavailable; you can share page details and optionally upload a screenshot instead.”**

Use the helper inbox at `/helper` or the helper-token-protected `GET /api/v1/escalations` to view waiting tickets. There is no learner self-service export endpoint: an operator can back up or export the SQLite file directly. A helper can delete a ticket through the inbox or `DELETE /api/v1/escalations/{ticket_id}`. Learners can clear widget-local data through their browser's site-data controls. SMS alerts can be turned off by texting `ALERT OFF`; Telegram job alerts can be turned off with `/alerts off`. Configure a persistent database volume and backups before deployment; the default Compose API database is inside the container.

## Cost to run (rough per month for 3,000 learners, and what works with zero budget)

The code has no required paid AI service: retrieval is the default, and Telegram is optional. A rough planning allowance for 3,000 registered learners is about US$20–80 per month for a small hosted Linux server, basic backup/storage, and a domain, assuming modest traffic and no paid AI. This is not a capacity quote: concurrent usage, media storage, backups, SMS volume, and any cloud model can increase it, and the repository has not been load-tested with 3,000 learners. Twilio SMS and cloud AI use are extra variable charges; local Ollama avoids per-request API fees but needs suitable compute and electricity.

With zero hosting budget, run Docker Compose on an existing computer for a demo, use retrieval with `AI_PROVIDER=none`, and omit SMS and cloud AI. That does not provide a reliable public service. Telegram's Bot API and the open-source components do not remove the cost of hosting or mobile data.

## Finished and not finished (honest)

Finished in code: the web component and retrieval API; English/Amharic course content and UI; partial Arabic/Oromo strings; tutor escalation and helper inbox; optional SMS, Telegram long polling, Ollama, webhooks, test-job JSON-LD, and consent-started desktop and page-context sharing.

Not finished: LTI integration, a production WebRTC relay/STUN/TURN setup, a production-grade persistent database/retention/export workflow, full Arabic/Oromo/Tigrinya/Somali translations, and a measured capacity test for 3,000 learners. The job postings are fictional test data. The current Compose configuration does not persist the API database or mount the root service-worker entry point.

## Libraries and their licences (list every library and licence)

These are the direct third-party dependencies declared in the repository manifests; versions are ranges and there is no lockfile pinning the transitive dependency set.

- FastAPI — MIT License.
- Uvicorn (including its `standard` extras) — BSD 3-Clause License.
- `cryptography` — Apache License 2.0 or BSD 3-Clause License.
- HTTPX — BSD 3-Clause License.
- `ruamel.yaml` — MIT License.
- pytest (development/test dependency) — MIT License.
- Terser (JavaScript build dependency) — BSD 2-Clause License.

The browser module otherwise uses native browser APIs and repository code. The Compose images (`python:3.12-slim`, `nginx:alpine`, and optional `ollama/ollama`) are separately licensed software distributions; check their image notices and installed-package manifests when preparing a production image.
