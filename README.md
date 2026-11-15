# db-assistant

## Hackathon submission details

- **Track:** 3 — Multilingual assistant and live help
- **Team members:** `[TEAM: fill in names and consented contact details]`
- **Co-designer:** `[TEAM: add the co-designer's consented identifier; do not add private contact or disability information]`
- **Main task:** `[TEAM: write the one-sentence task agreed with the co-designer, for example: “A learner asks a sourced course question and gets tutor help independently on their phone.”]`
- **Accessibility gate:** Not completed. See [CONFORMANCE.md](./CONFORMANCE.md); it requires a real co-designer session and cannot be satisfied by automated tests alone.

A multilingual learning assistant and tutor-escalation demo designed for accessibility-focused course support.

## Overview

`db-assistant` combines a lightweight web component, a FastAPI backend, and demo content to help learners ask questions about course material, check sources, and escalate to a tutor when needed. It is built to support multiple languages, optional AI-backed answers, queued offline questions, and learner-initiated help flows without forcing a heavy framework.

The project includes:

- a browser widget in `module/`
- a FastAPI app in `api/`
- static demo pages under `demo/` and `savanna/`
- Docker-based local setup with NGINX and optional AI integrations
- helper and learner-facing escalation flows for questions and follow-up replies

## Why this project

This repository demonstrates a practical pattern for learner support in digital education:

- answer learner questions from course content and job data
- show the exact source sections behind each answer
- support tutor escalation with status tracking and helper inbox flows
- work across multiple languages and browser contexts
- provide accessibility-friendly patterns for voice, screen-sharing, and offline retry

## Architecture

```text
Browser UI (module/db-assistant.js)
        |
        v
FastAPI backend (api/)
  - retrieval and question answering
  - content APIs
  - tutor escalation and helper inbox
  - optional SMS / Telegram / Ollama / cloud AI adapters
        |
        v
Static demo pages (demo/, savanna/)
```

## Quick start

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Update `.env` with a secure helper token and any optional service settings you need.

3. Start the stack:

```bash
docker compose up
```

4. Open the app and APIs:

- Lesson UI: http://localhost:8080/
- API docs: http://localhost:8081/docs
- Helper inbox: http://localhost:8081/helper

## Configuration

The app reads settings from `.env`. The following values are the main ones you will adjust:

| Variable | Purpose |
| --- | --- |
| `HELPER_TOKEN` | Protects helper endpoints with `X-Helper-Token` |
| `WEBHOOK_URL` | Optional URL for ticket-opened notifications |
| `ESCALATIONS_DB` | SQLite database path |
| `TICKET_RETENTION_DAYS` | Auto-expire tutor tickets and attachments |
| `AI_PROVIDER` | `none`, `local`, or `cloud` |
| `THRESHOLD` | Retrieval similarity threshold |
| `OLLAMA_URL` / `OLLAMA_MODEL` | Local Ollama configuration |
| `CLOUD_URL` / `CLOUD_API_KEY` / `CLOUD_MODEL` | Optional cloud AI configuration |
| `TELEGRAM_BOT_TOKEN` | Enables Telegram bot features |
| `SMS_ENCRYPTION_KEY` / Twilio variables | Optional SMS alert setup |

## Project structure

```text
.
├── api/                 # FastAPI service, retrieval logic, helper and escalation APIs
├── demo/                # Course and jobs demo data
├── module/              # Browser component and frontend assets
├── savanna/             # Demo page variants and job pages
├── tests/               # Playwright and pytest coverage
├── .env.example         # Example environment configuration
├── docker-compose.yml   # Local compose setup
├── openapi.yaml         # API schema
├── package.json         # Frontend scripts and dependency metadata
├── README.md            # Project overview and setup instructions
└── scripts/             # Additional build and validation scripts
```

## Usage

The frontend is loaded with a simple script tag and can be embedded in a page:

```html
<script src="/module/db-assistant.min.js" defer></script>
<db-assistant
  id="lesson-assistant"
  lang="en"
  api="https://api.example.org"
  content="/demo/data/content.json"
  theme="light"
></db-assistant>
```

This component supports:

- multi-language course content
- question answering from local course and jobs content
- source-linked answers
- tutor escalation flow
- optional AI answer fallback when configured
- browser-local retry and queued question behavior when offline
- an offline study pack for saving sourced answers locally and downloading them for review

The `<db-assistant>` component accepts `lang`, `api`, `content`, `theme`, and `debug` attributes. The `lang` attribute uses a locale file in `module/i18n/`; `api` is the API base URL; `content` optionally points to host-provided course JSON; `theme` accepts `light` or `dark`; `debug` enables retrieval-score details. The component dispatches bubbling, composed `db-assistant:ready`, `db-assistant:open`, `db-assistant:close`, `db-assistant:question`, `db-assistant:person`, `db-assistant:escalated`, and `db-assistant:error` events. `db-assistant:question` includes `{ text, language, input }`; `input` is `text` or `voice`. `db-assistant:escalated` includes `ticketId` and, for accommodation requests, `type`.

The `content` attribute is a browser-side source for local retrieval; the component does **not** upload that file to the backend. The API indexes its seeded `demo/data/content.json` at startup. To provision a host's content into the backend index, provide a valid JSON section array and upload it from a trusted deployment/operator environment using the helper token:

```bash
curl -X POST "$API/api/v1/content" \
  -H "X-Helper-Token: $HELPER_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @content.json
```

Do not expose the helper token in learner-facing HTML or JavaScript. An unauthenticated or invalid-token write returns 401; indexing is disabled with 503 when `HELPER_TOKEN` is not configured.

The blank-host proof is [demo/blank.html](./demo/blank.html). It contains only one external script tag and no Savanna or Bootstrap CSS. The component loads its search helper and locale resources relative to that script. It uses a shadow root for its UI styling and emits events instead of changing host page styles.

## API

The checked-in OpenAPI schema is in [`openapi.yaml`](./openapi.yaml). You can use the local Swagger UI at http://localhost:8081/docs after running Docker Compose.

Common flows include:

- `POST /api/v1/ask` for learner questions
- `GET /api/v1/voice/guide?language=en` for localized readable and speakable instructions
- `GET /api/v1/voice/capabilities` for locally installed speech model availability
- `GET /api/v1/voice/guide/audio?language=en` for locally synthesized guide audio (optional local Piper model)
- `POST /api/v1/voice/commands` for a transcript JSON body or raw `audio/*` upload
- `POST /api/v1/voice/actions/sync` for idempotent replay of offline voice drafts
- `GET /api/v1/content` and `POST /api/v1/content` for content management
- `POST /api/v1/escalations` for tutor-request creation
- `GET /api/v1/escalations` and `/api/v1/escalations/{ticket_id}` for helper and learner status
- `GET /api/v1/helper/escalations/{ticket_id}/brief` for an authorized helper handoff brief
- `POST /api/v1/escalations/{ticket_id}/reply` for tutor replies
- `GET /api/v1/helper/metrics` for privacy-safe queue age, reply-time, and feedback totals
- `GET /api/v1/helper/content-health` to check indexed sources, required languages, and placeholder text
- helper-only job notification and SMS endpoints when configured

Track 3 backend additions:

- **Offline voice assistance:** The backend defaults to `OFFLINE_MODE=true` and Compose sets it to true. Q&A uses local retrieval, webhooks/SMS/Telegram egress is suppressed, and voice drafts are signed while tutor sends use persistent idempotency keys. Set `VOICE_ACTION_SECRET` to a stable random value (at least 32 characters) before voice tutor sends will work. The guide is available as localized text without models. Audio transcription/synthesis require operator-provisioned local Vosk/Piper models and FFmpeg; `/api/v1/voice/capabilities` lists actual readiness. No paid API or cloud speech provider is called. Setting `OFFLINE_MODE=false` opts the rest of the backend back into configured external integrations; the voice endpoints remain local-only.

The backend does not record from the microphone or play audio. The browser must capture a recording, upload it (or submit an on-device speech transcript), play the returned guide text/audio, and call the API when recording ends. An offline device must record and queue a draft in browser storage; the API cannot run while disconnected. On reconnection, the client posts queued actions to the sync endpoint. A queued send executes only when its explicit supported-language confirmation and unexpired signed draft are present. Screen sharing still requires a browser prompt and learner approval.

Example:

```bash
curl http://localhost:8081/api/v1/voice/guide?language=en
curl -X POST http://localhost:8081/api/v1/voice/commands \
  -H 'Content-Type: application/json' \
  -d '{"transcript":"Explain this lesson","language":"en"}'
```

For tutor submission, first send a transcript such as `talk to a tutor` with `shareConsent: true`, then review and retain the returned `draftToken`. Confirm with transcript `send it`, the same `draftToken`, `shareConsent: true`, and a unique `Idempotency-Key` header of 16–128 safe characters. A retry with the same key returns the same ticket. Transcript-only mode assumes the browser recognizer is local; the server itself never sends speech to a remote recognizer.

The widget's **Speak a task** control records audio on the learner's explicit action and uploads it to the configured API for local transcription. It does not invoke the browser's speech-recognition service for this task flow. If the browser is offline, audio is queued in that browser's local storage (up to 1.6 MB per recording) and replayed through the idempotent sync endpoint after reconnection. The ordinary **Use microphone** dictation control still uses the browser's speech recognition when available; its network behavior depends on the browser and device and is not claimed to be offline. Tutor requests open the existing consent control; the learner must check it, repeat the request, review the draft, then speak “send it.”

### Local speech engine setup

No speech models are bundled. The current checkout reports transcript input available but server-side STT and TTS unavailable until local tools and model files are provisioned. Install FFmpeg and Vosk in the API environment, install the Piper executable, and place the chosen local model files on disk. Then set paths in `.env` for each model actually installed, for example:

```dotenv
OFFLINE_MODE=true
VOICE_PROVIDER=local
VOICE_ACTION_SECRET=<generate-a-stable-random-secret-at-least-32-characters>
FFMPEG_EXECUTABLE=ffmpeg
PIPER_EXECUTABLE=piper
VOICE_STT_MODEL_EN=/models/vosk-en
VOICE_TTS_MODEL_EN=/models/en_US-lessac-medium.onnx
```

Use the `VOICE_STT_MODEL_AM`, `VOICE_STT_MODEL_TI`, `VOICE_STT_MODEL_OM`, `VOICE_STT_MODEL_SO`, and `VOICE_STT_MODEL_AR` variables for other Vosk model directories, and matching `VOICE_TTS_MODEL_<LANG>` paths for Piper `.onnx` files. These are examples of path conventions, not bundled or verified model recommendations. Check each selected model's own license and language quality before redistribution. Query `/api/v1/voice/capabilities` to see which languages are ready. Missing local models result in a clear `503`; no cloud STT/TTS fallback is attempted. Do not put a real key or secret in source control.

### Copy-paste API examples

These examples cover every API route in the OpenAPI contract. Set placeholders only in your local shell; use test data. The backend defaults to offline mode, so webhook, SMS, Telegram, and cloud-AI egress remain disabled.

```bash
API=http://localhost:8081
HELPER_TOKEN=replace-with-local-helper-token
TICKET_ID=replace-with-ticket-id
LEARNER_TOKEN=replace-with-learner-access-token
FEEDBACK_ID=replace-with-feedback-id

curl -H "X-Helper-Token: $HELPER_TOKEN" "$API/api/v1/helper/metrics"
curl -H "X-Helper-Token: $HELPER_TOKEN" "$API/api/v1/helper/content-health"
curl -X POST "$API/api/v1/content" -H "X-Helper-Token: $HELPER_TOKEN" -H 'Content-Type: application/json' -d '[{"id":"demo-1","title":"Demo lesson","url":"/lesson#demo-1","text":{"en":"A test lesson sentence."}}]'
curl "$API/api/v1/content"
curl "$API/api/v1/voice/guide?language=en"
curl "$API/api/v1/voice/capabilities"
curl "$API/api/v1/voice/guide/audio?language=en" -o voice-guide.wav
curl -X POST "$API/api/v1/voice/commands" -H 'Content-Type: application/json' -d '{"transcript":"Explain this lesson","language":"en"}'
curl -X POST "$API/api/v1/voice/actions/sync" -H 'Content-Type: application/json' -d '{"actions":[{"id":"offline-demo-1","expiresAt":9999999999,"idempotencyKey":"voice-demo-action-key-1","transcript":"Explain this lesson","language":"en"}]}'
curl -X POST "$API/api/v1/ask" -H 'Content-Type: application/json' -d '{"question":"What does the lesson say?","language":"en"}'
curl -X POST "$API/api/v1/answer-feedback" -H 'Content-Type: application/json' -d '{"kind":"answer","reason":"unhelpful","sourceUrl":"/lesson#demo-1"}'
curl -H "X-Helper-Token: $HELPER_TOKEN" "$API/api/v1/answer-feedback"
curl -X POST "$API/api/v1/answer-feedback/$FEEDBACK_ID/reviewed" -H "X-Helper-Token: $HELPER_TOKEN"
curl "$API/api/v1/config"
curl -X POST "$API/api/v1/jobs/notify" -H "X-Helper-Token: $HELPER_TOKEN" -H 'Content-Type: application/json' -d '{"job":{"id":"demo-job","title":"Test role","location":"Addis Ababa","url":"/jobs#demo-job","description":"Test data only","remote":true}}'
curl -X POST "$API/api/v1/sms/inbound" -H 'Content-Type: application/json' -d '{"from":"0912345678","text":"JOBS"}'
curl -X POST "$API/sms/inbound" -H 'Content-Type: application/json' -d '{"from":"0912345678","text":"JOBS"}'
curl -X POST "$API/api/v1/escalations" -H 'Content-Type: application/json' -d '{"conversation":[{"role":"user","text":"Please help with this lesson."}],"language":"en","page":"/lesson"}'
curl -H "X-Helper-Token: $HELPER_TOKEN" "$API/api/v1/escalations"
curl -H "X-Helper-Token: $HELPER_TOKEN" "$API/api/v1/helper/escalations/$TICKET_ID/brief"
curl -H "X-Learner-Token: $LEARNER_TOKEN" "$API/api/v1/escalations/$TICKET_ID"
curl -H "X-Learner-Token: $LEARNER_TOKEN" "$API/api/v1/escalations/$TICKET_ID/data"
curl -X DELETE -H "X-Learner-Token: $LEARNER_TOKEN" "$API/api/v1/escalations/$TICKET_ID/data"
curl -X POST "$API/api/v1/escalations/$TICKET_ID/signal" -H 'Content-Type: application/json' -d '{"type":"offer","sdp":"test-only-session-description"}'
curl -H "X-Helper-Token: $HELPER_TOKEN" "$API/api/v1/escalations/$TICKET_ID/signal?type=offer"
curl -X DELETE "$API/api/v1/escalations/$TICKET_ID/signal"
curl -X POST "$API/api/v1/escalations/$TICKET_ID/reply" -H "X-Helper-Token: $HELPER_TOKEN" -H 'Content-Type: application/json' -d '{"text":"Test tutor reply","resolve":true}'
curl -X DELETE "$API/api/v1/escalations/$TICKET_ID" -H "X-Helper-Token: $HELPER_TOKEN"
```

For an SMS gateway, configure it to POST JSON `{ "from": "0912345678", "text": "JOBS" }` to `/sms/inbound` (or `/api/v1/sms/inbound`) and return the plain-text body to the sender. The handler formats replies within the SMS limit. There is no SMS gateway bundled; use the curl request above for a local simulation. Job alerts and SMS delivery require external integrations and are skipped in offline mode.

- **Verifiable answers:** `/api/v1/ask` returns a `grounding` object with its evidence quote, source URL, retrieval score, and verification method. Refused or unmatched answers have no evidence. Confidence bands are based on retrieval similarity, not calibrated probabilities.
- **Request tracing:** responses carry `X-Request-ID`; JSON logs record route, method, status, elapsed time, and request ID without question text, ticket contents, or phone numbers.
- **Abuse protection:** configurable request limits apply to learner Q&A, tutor requests, and inbound SMS. The limiter is process-local; use one API worker or put a shared limiter in front of multiple workers.
- **Tutor operations:** helper-only metrics show queue age, stale waiting requests, average reply time, and unreviewed answer feedback without returning conversation or contact data.
- **Course quality checks:** helper-only content health reports broken/missing source references, placeholder text, and gaps in supported-language titles or lesson text.

The default rate limits are 120 Q&A requests, 20 tutor requests, and 30 inbound SMS requests per client per 60 seconds. A rejected request returns HTTP 429 and `Retry-After`. Set a limit to `0` to disable it. `TUTOR_STALE_MINUTES` controls when a waiting ticket appears as stale in the helper metrics.

Tutor endpoints use `X-Helper-Token`. For example:

```bash
curl -H "X-Helper-Token: $HELPER_TOKEN" http://localhost:8081/api/v1/helper/metrics
curl -H "X-Helper-Token: $HELPER_TOKEN" http://localhost:8081/api/v1/helper/content-health
```

The answer response includes a `grounding` object. Successful answers include the exact source quote and a confidence band based on retrieval similarity; this score is not a calibrated probability. Refused or unmatched questions return `status: unverified` and no evidence.

### Tutor handoff briefs

Creating an escalation stores a version-1 `handoffBrief` with the learner language, a query-free lesson/job page path, a concise locally built summary, the handoff reason, and either a verified indexed source or `evidenceStatus: "unavailable"`. Briefs use only the shared conversation and indexed retrieval evidence; no cloud model is called. The original conversation remains on the helper ticket. Briefs are returned only from helper-authenticated ticket endpoints, not learner ticket/status/export endpoints. Older tickets without a stored brief are regenerated locally on the helper brief endpoint.

The optional `handoffReason` request field accepts `answer_not_found`, `learner_requested_person`, `answer_flagged_incorrect`, or `other`. If omitted, the API derives `answer_not_found` from a shared assistant message with that answer status, and otherwise uses `learner_requested_person`.

```bash
curl -X POST http://localhost:8081/api/v1/escalations \
  -H "Content-Type: application/json" \
  -d '{
    "conversation": [
      {"role": "user", "text": "What does this lesson say about virtual assistant work?"},
      {"role": "assistant", "text": "Please review this course section.", "answerStatus": "answered"}
    ],
    "language": "en",
    "page": "http://localhost:8080/savanna/pages/concept-with-navigation.html",
    "handoffReason": "learner_requested_person"
  }'

curl -H "X-Helper-Token: $HELPER_TOKEN" \
  http://localhost:8081/api/v1/helper/escalations/TICKET_ID/brief
```

The helper-only brief response contains `version`, `language`, `requestedPage`, `summary`, `source` (`null` when no reliable match exists), `reason`, and `evidenceStatus`. The authenticated helper inbox also includes `handoffBrief`; render it as text rather than HTML.

Example helper response:

```json
{
  "version": 1,
  "language": "en",
  "requestedPage": "/savanna/pages/concept-with-navigation.html",
  "summary": "The learner question matched indexed course material: \"What is Shaping the Future of VA Work\". Relevant indexed excerpt: ...",
  "source": {
    "title": "What is Shaping the Future of VA Work",
    "url": "savanna/pages/concept-with-navigation.html#what-is-shaping-the-future-of-va-work"
  },
  "reason": "learner_requested_person",
  "evidenceStatus": "available"
}
```

## Local development and testing

Run the module build and test commands from the repo root:

```bash
npm run build:module
npm run check:module-size
npm test
python -m pytest -q
npm run test:e2e
npm run test:axe
```

Playwright starts the FastAPI app as its web server so demo pages and `/api/v1` share an origin. `E2E_PORT` selects the local port (default `18010`); `E2E_DB_PATH` overrides the process-specific temporary SQLite test database.

These checks provide local integration evidence for the project, but they are not a substitute for live user testing, accessibility review on real devices, or production deployment validation.

### Verification record — 2026-11-17

- `npm.cmd run build:module` and `npm.cmd run check:module-size` completed successfully. The generated `module/db-assistant.min.js` bundle is 20.59 KB gzipped (21,089 bytes).
- `npm.cmd test` passed all 37 JavaScript tests.
- `python -m pytest -q` passed all 111 Python tests. Pytest reported one Starlette/httpx deprecation warning. Python syntax checks passed for `api/main.py`, `api/telegram_bot.py`, and `scripts/build_content.py`.
- The full Playwright run used `E2E_PORT=18026` and a temporary SQLite database: `npm.cmd run test:e2e -- --reporter=line` passed all 33 tests. This included all five axe scenarios, which found no critical or serious violations; the queued-question case reached axe analysis. E2E uses the API app as its web server, offline integrations, a test-only helper token, and a temporary database.
- `docker compose config --quiet` completed successfully. `docker info` could not connect to `npipe:////./pipe/dockerDesktopLinuxEngine` because the Docker Desktop Linux engine pipe was missing; no container runtime check passed.
- The Slow 3G script was attempted against `demo/blank.html` on a reachable local API server. PowerShell rejected the script with `PSSecurityException` because script execution is disabled; Lighthouse did not run and no load/FCP measurement is claimed.
- The browser test checked that JobPosting JSON-LD matches rendered listing data. The graph omits guide example fields `datePosted` and `employmentType` and uses an unstructured place name instead of a postal address, so full Schema.org completeness is not claimed.

## Accessibility and privacy notes

This project intentionally focuses on accessibility and learner support, but it is still a demo/prototype. Some important points:

- learners can ask about course content, see source links, and open tutor help flows
- voice input, screen sharing, and page-context sharing are gated behind explicit learner actions
- the app stores ticket metadata and learner conversation content only when the flow is used
- data retention can be configured with `TICKET_RETENTION_DAYS`
- AI consent is required when using a cloud provider and the learner does not opt in

For real deployment, treat the repository as a foundation rather than a production-ready service. Review privacy, retention, onboarding, and accessibility validation before launching with live learners.

## Notes

- The app includes partial translations and demo content; translation quality should be reviewed before production use.
- The job listings and some integrations are demo/test data rather than live production services.
- WebRTC, SMS, Telegram, and webhook flows are included as examples or optional integrations and require proper deployment and validation.

## Languages and adding a locale

The component currently has locale packs for English, Amharic, Tigrinya, Afaan Oromo, Somali, and Arabic. Adding a supported language still requires updating the selector and API language declarations as well as `module/i18n/<code>.json` and translated course/job data; adding only the JSON file is not yet supported. For right-to-left languages set `dir: "rtl"` and use logical CSS properties. A fluent speaker should review every label, error, guide step, answer, and voice phrase before describing a locale as complete. See [TRANSLATION_REVIEW.md](./TRANSLATION_REVIEW.md) for current coverage and sign-off fields. The non-English translations still need fluent-speaker review.

## Offline behavior, data, and privacy

- Typed questions use the local course/job index when offline and the existing browser queue stores pending questions locally.
- Voice task recordings are queued in browser local storage only while offline and removed after a sync response. The server handles audio in memory/pipe-based local processing and does not persist raw command audio. Ordinary tutor voice notes remain an explicit attachment in the existing tutor flow.
- Tutor conversation content is stored in SQLite when a tutor ticket is created with sharing consent. Learner ticket access tokens are held in browser local storage so the learner can check, export, or delete their ticket. `TICKET_RETENTION_DAYS` controls automatic server-side expiry.
- `GET /api/v1/escalations/{ticket_id}/data` exports a learner's ticket with `X-Learner-Token`; `DELETE` on the same `/data` path deletes it. The widget also has local clear-data controls.
- The default `OFFLINE_MODE=true` prevents cloud AI, webhook, SMS, and Telegram egress from the API. Screen sharing is user-started and uses the browser's native permission prompt. The Android alternative sends page details and an optional learner-selected screenshot.
- The server cannot operate while a device has no connection. Browser recording and local queue storage happen on the device. `Speak a task` uploads to the configured server only after recording ends and a connection is available.

## Performance, costs, and libraries

- **Bundle size:** Built with `npm.cmd run build:module`; measured by `npm.cmd run check:module-size` as **20.59 KB gzipped (21,089 bytes)** on 2026-11-17. This is the generated `module/db-assistant.min.js` bundle.
- **Slow 3G:** Not measured. On 2026-11-17, the local API server was reachable, but PowerShell blocked `scripts/measure-slow3g.ps1` with `PSSecurityException` because script execution is disabled. Run the script in an environment that permits it; then record observed load time, First Contentful Paint, method, and date.
- **Rough cost for 3,000 learners:** With an institution-provided host, local open-source inference, and external SMS/AI disabled, the software/API subscription cost is approximately **$0 per month**. This excludes the host's hardware, electricity, internet, operations, and any optional paid messaging. No load test or concurrency profile for 3,000 learners has been completed, so infrastructure cost and capacity need a measured deployment profile before launch.
- **Direct runtime dependencies and licenses:** FastAPI (MIT), Uvicorn (BSD-3-Clause), cryptography (Apache-2.0 OR BSD-3-Clause), HTTPX (BSD-3-Clause), and ruamel.yaml (MIT). Browser/test tooling: `@axe-core/playwright` (MPL-2.0), `@playwright/test` (Apache-2.0), and Terser (BSD-2-Clause). The lock files identify exact versions; review transitive package, base-image, and any separately provisioned speech-model licenses before redistribution.

## Current completion status

- **Implemented:** Track 3 assistant and helper flows, career/job content, versioned API/OpenAPI, backend voice guide and local command processing, consented/idempotent tutor voice sends, local offline queues, and a blank-host embed demo. All five automated axe scenarios passed with no critical or serious violations; this is not a human accessibility gate. JobPosting JSON-LD matches rendered listing data in the browser test, but its full schema completeness is unverified; treat Level 3 as partial.
- **Not yet evidenced:** Co-designer accessibility gate, actual 200% browser zoom and assistive-technology testing, physical-device voice/model coverage, fluent-speaker review of all locales, screen-share interoperability on real networks, Docker runtime/clean-machine startup, Slow 3G measurement, and 3,000-learner load/cost validation. The Compose file parses successfully, but the Docker daemon was unavailable for a runtime check.
- **Voice models:** No Vosk/Piper model files are bundled or installed in this checkout. Text transcript mode works without them; raw-audio transcription and generated guide audio require local models and FFmpeg.
- **Team input still required:** Team/co-designer identifiers, agreed main-task sentence, exact ALX-selected open-source license, co-designer test record, model choices/licenses, and actual performance/cost measurements.

## License

**TEAM DECISION REQUIRED:** The supplied Track 3 guide says to use the open license named by ALX at kick-off, but the provided guide copy and repository do not name it. Ask the mentor/ALX team which license was selected, then add that exact license as the root `LICENSE` file before submission. Do not treat this README placeholder as a grant to redistribute the code.
