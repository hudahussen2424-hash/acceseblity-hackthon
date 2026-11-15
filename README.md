# db-assistant

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
<script src="/module/db-assistant.js" defer></script>
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

## API

The checked-in OpenAPI schema is in [`openapi.yaml`](./openapi.yaml). You can use the local Swagger UI at http://localhost:8081/docs after running Docker Compose.

Common flows include:

- `POST /api/v1/ask` for learner questions
- `GET /api/v1/content` and `POST /api/v1/content` for content management
- `POST /api/v1/escalations` for tutor-request creation
- `GET /api/v1/escalations` and `/api/v1/escalations/{ticket_id}` for helper and learner status
- `GET /api/v1/helper/escalations/{ticket_id}/brief` for an authorized helper handoff brief
- `POST /api/v1/escalations/{ticket_id}/reply` for tutor replies
- `GET /api/v1/helper/metrics` for privacy-safe queue age, reply-time, and feedback totals
- `GET /api/v1/helper/content-health` to check indexed sources, required languages, and placeholder text
- helper-only job notification and SMS endpoints when configured

Track 3 backend additions:

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

These checks provide local integration evidence for the project, but they are not a substitute for live user testing, accessibility review on real devices, or production deployment validation.

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

## License

This repository does not currently declare a project license in the root manifest. Check the relevant package and image licenses before production use or redistribution.
