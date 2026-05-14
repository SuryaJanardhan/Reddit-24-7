# Reddit-24-7

Node.js + TypeScript backend for autonomous Reddit signal tracking, engagement decisioning, trend analytics, and Google Sheets reporting.

## Core capabilities

- Ingest Reddit posts/comments via REST.
- Analyze engagement, sentiment, virality, and pattern signals.
- Decide action path (`save`, `summarize`, `alert`, `draft_reply`, etc.).
- Generate humanized drafts with **Groq multi-key rotation** and **lightweight/complex model routing**.
- Enforce channel-level safety pacing for Reddit, Sheets, and LLM workloads.
- Build cumulative analytics (daily, weekly, monthly) across pattern performance.
- Export analytics into a **multi-tab Google Sheets workbook payload** with chart specs (bar/pie) and textual pattern database rows.
- Optionally push workbook payload to a Google Sheets integration webhook.
- Cache analytics in Redis to reduce recomputation and memory pressure.

## High-level flow

1. `POST /api/events/ingest` accepts a Reddit event.
2. Collector normalizes text + keywords.
3. Analysis engine computes trend/engagement features.
4. Strategy engine selects action and priority.
5. Draft actions call Groq with:
   - key rotation across configured API keys,
   - model routing: lightweight model for small prompts, complex model for heavier prompts,
   - retry + backoff + fallback.
6. Safety engine checks toxicity/spam/repetition before queueing.
7. Queue schedules execution with rate-limit aware delay.
8. Outcomes recorded through `POST /api/actions/outcome`.
9. Pattern analytics are generated from outcomes + actions + events.
10. Workbook payload is generated for Google Sheets and can be pushed using webhook integration.

## Architecture modules

- `src/orchestrator.ts` — pipeline coordination, queueing, analytics generation, workbook export.
- `src/engines/*` — collector, analysis, strategy, safety, execution, pattern analytics.
- `src/llm/groqClient.ts` — Groq API client with model routing, retries, and key rotation.
- `src/rateLimit/channelRateLimiter.ts` — utilization-capped scheduler.
- `src/cache/analyticsCache.ts` — Redis-backed analytics cache (optional).
- `src/sheets/googleSheetsSyncService.ts` — workbook construction + webhook-based Sheets sync.
- `src/routes/api.ts` — REST API endpoints.
- `src/store/inMemoryStore.ts` — in-process event/action/outcome store.

## Memory and persistence model

- Runtime memory usage is minimized by:
  - short-lived in-process arrays for active pipeline operations,
  - Redis caching for analytics snapshots (`ANALYTICS_CACHE_TTL_SEC`).
- Long-term durable analytics persistence is expected through Google Sheets workbook exports.
- For low-memory deployments, run with external Redis and frequent Sheets export/sync intervals.

## Prerequisites

- Node.js 20+
- npm 10+
- Redis (recommended for queue + analytics cache)
- Groq API keys
- Google Sheets integration endpoint (webhook/App Script/connector) if push sync is required

## Environment variables

All variables are optional in development, but production should define them explicitly.

| Variable | Default | Purpose |
|---|---:|---|
| `PORT` | `3000` | HTTP server port |
| `REDIS_URL` | _unset_ | Enables BullMQ + Redis analytics cache |
| `QUEUE_NAME` | `reddit-actions` | Queue name |
| `DEFAULT_PERSONA` | `helpful_redditor` | Fallback rewrite persona |
| `DEFAULT_REPLY_DELAY_MS` | `120000` | Base queue delay |
| `RATE_LIMIT_UTILIZATION_TARGET` | `0.8` | Safety cap fraction of configured rate limits |
| `REDDIT_REQUESTS_PER_MINUTE` | `30` | Reddit request budget |
| `SHEETS_REQUESTS_PER_MINUTE` | `60` | Sheets request budget |
| `LLM_REQUESTS_PER_MINUTE` | `30` | LLM request budget |
| `GROQ_API_KEYS` | _unset_ | Comma-separated key list |
| `GROQ_API_KEY_1..GROQ_API_KEY_5` | _unset_ | Individual key variables |
| `GROQ_MODEL_LIGHTWEIGHT` / `GROQ_MODEL_LIGHT` | `llama-3.1-8b-instant` | Lower-cost model for smaller prompts |
| `GROQ_MODEL_COMPLEX` / `GROQ_MODEL_HEAVY` | `llama-3.3-70b-versatile` | Higher reasoning model for complex prompts |
| `GROQ_COMPLEX_PROMPT_THRESHOLD_CHARS` | `600` | Prompt-size split between lightweight and complex model |
| `GROQ_MAX_RETRIES` | `8` | Retry attempts across key/model rotation |
| `GROQ_BASE_RETRY_MS` | `800` | Exponential backoff base |
| `ANALYTICS_CACHE_TTL_SEC` | `120` | Redis analytics cache TTL |
| `VIRAL_PEAK_THRESHOLD` | `0.7` | Viral radar threshold |
| `ENABLE_SHEETS_SYNC` | `true` | Enable/disable sync attempts |
| `GOOGLE_SHEETS_WEBHOOK_URL` | _unset_ | Endpoint receiving workbook payload |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | _unset_ | Spreadsheet identifier included in payload |
| `GOOGLE_SHEETS_SYNC_TIMEOUT_MS` | `15000` | Sync timeout |

Example:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
QUEUE_NAME=reddit-actions

RATE_LIMIT_UTILIZATION_TARGET=0.8
REDDIT_REQUESTS_PER_MINUTE=30
SHEETS_REQUESTS_PER_MINUTE=60
LLM_REQUESTS_PER_MINUTE=30

GROQ_API_KEY_1=key_1
GROQ_API_KEY_2=key_2
GROQ_API_KEY_3=key_3
GROQ_API_KEY_4=key_4
GROQ_API_KEY_5=key_5
GROQ_MODEL_LIGHTWEIGHT=llama-3.1-8b-instant
GROQ_MODEL_COMPLEX=llama-3.3-70b-versatile
GROQ_COMPLEX_PROMPT_THRESHOLD_CHARS=600
GROQ_MAX_RETRIES=8
GROQ_BASE_RETRY_MS=800

ANALYTICS_CACHE_TTL_SEC=120
VIRAL_PEAK_THRESHOLD=0.7

ENABLE_SHEETS_SYNC=true
GOOGLE_SHEETS_WEBHOOK_URL=https://your-sheets-connector.example/sync
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SHEETS_SYNC_TIMEOUT_MS=15000
```

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Build + start:

```bash
npm run build
npm start
```

## Validation scripts

```bash
npm run build
npm test
```

`npm test` is currently informational.

## API reference

Base path: `/api`

- `GET /health`
- `POST /events/ingest`
- `GET /events?limit=100`
- `GET /actions?limit=100`
- `POST /actions/outcome`
- `GET /analytics/dashboard`
- `GET /analytics/patterns?refresh=true|false`
- `POST /analytics/export/sheets`

### Export analytics workbook

Request:

```json
{
  "pushToSheets": true
}
```

Response includes:

- `workbook` with tabs:
  - `Overview`
  - `Daily Analytics`
  - `Weekly Analytics`
  - `Monthly Analytics`
  - `Pattern Text DB`
  - `Viral Radar`
- `sync` result describing whether payload push was attempted/successful.

## Google Sheets integration notes

- The service builds chart-ready tab payloads with color metadata (pie/bar chart specs).
- `Pattern Text DB` tab stores textual summaries so future agents + humans can interpret pattern performance quickly.
- Workbook payload can be consumed by:
  - Google Apps Script webhook,
  - custom middleware writing via Sheets API,
  - any connector that maps `tabs/rows/charts` into a spreadsheet.
- Agent-level read/write/edit/delete controls should be enforced in your external Sheets connector layer and IAM/service-account policies.

## Rate-limit and anti-flagging safeguards

- A utilization cap (`RATE_LIMIT_UTILIZATION_TARGET`) enforces operation below configured channel ceilings.
- Reddit, Sheets, and LLM operations are independently paced.
- Groq path has exponential backoff and key rotation.
- Safety scan blocks risky drafts before queue execution.
- Keep operations aligned with Reddit platform rules and API terms.

## Queueing and broker note

- Current implementation uses BullMQ + Redis.
- **RabbitMQ is not required right now** for current architecture.
- If future scale requires advanced routing patterns, cross-service fanout, or strict delivery semantics beyond current needs, RabbitMQ can be introduced later as an infrastructure upgrade.

## Operational recommendations

- Use at least 4–5 Groq keys for robust rotation/fallback behavior.
- Prefer external Redis in production to reduce memory spikes.
- Schedule periodic workbook exports to keep Sheets as durable analytics record.
- Monitor moderation-removal rate in workbook tabs to tune strategy and reduce account risk.
