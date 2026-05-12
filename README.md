# Reddit-24-7

Node.js + TypeScript REST backend for a multi-agent Reddit autonomous operations pipeline.

## What this service does

- Ingests Reddit posts/comments through REST
- Runs pipeline: collector -> analysis -> strategy -> humanization -> safety -> execution queue
- Uses Groq LLM generation for reply drafts (with key rotation + retries)
- Applies channel-level rate-limit guards for Reddit, Sheets, and LLM activity

## Tech stack

- Node.js
- TypeScript
- Express
- BullMQ + Redis (optional)
- Groq Chat Completions API

## Prerequisites

- Node.js 20+
- npm 10+
- Redis (optional)
- Groq API keys (recommended for LLM drafting)

## Environment variables

All variables are optional; defaults are provided. For production, configure them explicitly.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP server port |
| `REDIS_URL` | No | _unset_ | Enables Redis/BullMQ queue |
| `QUEUE_NAME` | No | `reddit-actions` | Queue name |
| `DEFAULT_PERSONA` | No | `helpful_redditor` | Fallback persona for local rewrite |
| `DEFAULT_REPLY_DELAY_MS` | No | `120000` | Base queue delay |
| `RATE_LIMIT_UTILIZATION_TARGET` | No | `0.8` | Uses only this fraction of configured limits (recommended <= `0.8`) |
| `REDDIT_REQUESTS_PER_MINUTE` | No | `30` | Reddit channel baseline limit |
| `SHEETS_REQUESTS_PER_MINUTE` | No | `60` | Google Sheets channel baseline limit |
| `LLM_REQUESTS_PER_MINUTE` | No | `30` | LLM channel baseline limit |
| `GROQ_API_KEYS` | No | _unset_ | Comma-separated keys; rotates automatically |
| `GROQ_API_KEY_1`..`GROQ_API_KEY_4` | No | _unset_ | Alternate way to provide up to 4 keys |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Groq model |
| `GROQ_MAX_RETRIES` | No | `8` | Max retry attempts across failures/429/5xx |
| `GROQ_BASE_RETRY_MS` | No | `800` | Exponential backoff base delay |

Example `.env`:

```env
PORT=3000
# REDIS_URL=redis://localhost:6379
QUEUE_NAME=reddit-actions
DEFAULT_PERSONA=helpful_redditor
DEFAULT_REPLY_DELAY_MS=120000

RATE_LIMIT_UTILIZATION_TARGET=0.8
REDDIT_REQUESTS_PER_MINUTE=30
SHEETS_REQUESTS_PER_MINUTE=60
LLM_REQUESTS_PER_MINUTE=30

GROQ_API_KEY_1=your_key_1
GROQ_API_KEY_2=your_key_2
GROQ_API_KEY_3=your_key_3
GROQ_API_KEY_4=your_key_4
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_MAX_RETRIES=8
GROQ_BASE_RETRY_MS=800
```

## Setup

```bash
npm install
```

## Run locally

```bash
npm run dev
```

## Build and run

```bash
npm run build
npm start
```

## How to test

### 1) Script checks

```bash
npm run build
npm test
```

Current `npm test` is informational (`No tests configured`).

### 2) API smoke test

Start server first (`npm run dev`), then:

```bash
curl -s http://localhost:3000/api/health
```

Ingest sample event:

```bash
curl -s -X POST http://localhost:3000/api/events/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "id":"evt-1",
    "type":"post",
    "subreddit":"startups",
    "author":"demo_user",
    "title":"Launching an AI side project",
    "body":"Would love feedback on positioning and early distribution.",
    "createdAt":"2026-01-01T00:00:00.000Z",
    "score":12,
    "numComments":4
  }'
```

Check actions/dashboard:

```bash
curl -s http://localhost:3000/api/actions
curl -s http://localhost:3000/api/analytics/dashboard
```

## Safety and anti-flagging controls

- **80%-cap limiter**: channel schedulers pace Reddit/Sheets/LLM actions to `RATE_LIMIT_UTILIZATION_TARGET`.
- **Groq key rotation**: request attempts rotate across available keys.
- **Retry/backoff**: exponential retry on rate-limit/transient failures.
- **Safety scan**: generated drafts pass toxicity/spam/repetition checks before execution.

## API endpoints

Base path: `/api`

- `GET /health`
- `POST /events/ingest`
- `GET /events?limit=100`
- `GET /actions?limit=100`
- `POST /actions/outcome`
- `GET /analytics/dashboard`

## Notes

- Storage is currently in-memory.
- Queue uses in-memory fallback when `REDIS_URL` is not set.
- If Groq keys are missing/unavailable, the system falls back to local draft rewriting.
