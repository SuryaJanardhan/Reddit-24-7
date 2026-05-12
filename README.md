# Reddit-24-7

Node.js + TypeScript REST backend for a multi-agent Reddit autonomous operations pipeline.

## What this service does

- Ingests Reddit posts/comments through REST
- Runs a pipeline: collector -> analysis -> strategy -> humanization -> safety -> execution queue
- Tracks actions/outcomes and exposes dashboard metrics

## Tech stack

- Node.js
- TypeScript
- Express
- BullMQ + Redis (optional)

## Prerequisites

- Node.js 20+
- npm 10+
- Redis (optional, only if you want real BullMQ-backed queueing)

## Environment variables

All vars are optional unless you want Redis queueing.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP port |
| `REDIS_URL` | No | _unset_ | Enables Redis/BullMQ queue when set |
| `QUEUE_NAME` | No | `reddit-actions` | Queue name for execution jobs |
| `DEFAULT_PERSONA` | No | `helpful_redditor` | Persona used by humanization layer |
| `DEFAULT_REPLY_DELAY_MS` | No | `120000` | Default queued execution delay |

Example `.env`:

```env
PORT=3000
# REDIS_URL=redis://localhost:6379
QUEUE_NAME=reddit-actions
DEFAULT_PERSONA=helpful_redditor
DEFAULT_REPLY_DELAY_MS=120000
```

## Setup

```bash
npm install
```

## Run locally (development)

```bash
npm run dev
```

## Build and run (production style)

```bash
npm run build
npm start
```

## How to test

### 1) Script-level checks

```bash
npm run build
npm test
```

Current `npm test` is informational (`No tests configured`).

### 2) API smoke test

Start server first (`npm run dev`), then run:

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

Check stored actions and dashboard:

```bash
curl -s http://localhost:3000/api/actions
curl -s http://localhost:3000/api/analytics/dashboard
```

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
- Next scaling step is replacing store with MongoDB/PostgreSQL repositories.
