# Reddit-24-7

Node.js + TypeScript REST backend for a multi-agent Reddit autonomous operations pipeline.

## Features

- Collector engine for normalized Reddit post/comment ingestion
- Analysis engine for sentiment, virality, controversy, subreddit culture, and trend signals
- Strategy agent for action selection (ignore, save, summarize, alert, draft reply, schedule)
- Humanization layer for persona-based natural rewrites
- Safety engine for toxicity/spam/rule-risk checks
- Reply/Post execution queue using BullMQ + Redis (with in-memory fallback if Redis is not configured)
- In-memory analytics dashboard for action/outcome tracking

## Tech Stack

- Node.js
- TypeScript
- Express REST APIs
- BullMQ + Redis (optional runtime)

## Setup

```bash
npm install
npm run dev
```

Optional environment variables:

- `PORT` (default: `3000`)
- `REDIS_URL` (if set, enables BullMQ Redis-backed queue)
- `QUEUE_NAME` (default: `reddit-actions`)
- `DEFAULT_PERSONA` (default: `helpful_redditor`)
- `DEFAULT_REPLY_DELAY_MS` (default: `120000`)

## Build & Run

```bash
npm run build
npm start
```

## API Endpoints

Base path: `/api`

- `GET /health` — service health
- `POST /events/ingest` — ingest Reddit post/comment and run end-to-end decisioning
- `GET /events?limit=100` — list captured events
- `GET /actions?limit=100` — list planned/executed/blocked actions
- `POST /actions/outcome` — feed engagement outcomes (karma/mod removals/replies)
- `GET /analytics/dashboard` — aggregate operations metrics

## Notes

- Current storage is in-memory for bootstrap speed.
- For scaling, swap the store layer with MongoDB or PostgreSQL repositories.
- Keep Reddit API integration in a dedicated collector worker that calls `POST /events/ingest`.
