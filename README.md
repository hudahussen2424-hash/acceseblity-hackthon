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

## API

The checked-in OpenAPI schema is in [`openapi.yaml`](./openapi.yaml). You can use the local Swagger UI at http://localhost:8081/docs after running Docker Compose.

Common flows include:

- `POST /api/v1/ask` for learner questions
- `GET /api/v1/content` and `POST /api/v1/content` for content management
- `POST /api/v1/escalations` for tutor-request creation
- `GET /api/v1/escalations` and `/api/v1/escalations/{ticket_id}` for helper and learner status
- `POST /api/v1/escalations/{ticket_id}/reply` for tutor replies
- helper-only job notification and SMS endpoints when configured

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
