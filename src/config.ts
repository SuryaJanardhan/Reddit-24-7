import dotenv from 'dotenv';

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return fallback;
};

const parseGroqKeys = (): string[] => {
  const combined = process.env.GROQ_API_KEYS
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const indexed = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5
  ]
    .map((entry) => entry?.trim())
    .filter((entry): entry is string => Boolean(entry));

  return [...new Set([...(combined ?? []), ...indexed])];
};

export const config = {
  port: parseNumber(process.env.PORT, 3000),
  redisUrl: process.env.REDIS_URL,
  queueName: process.env.QUEUE_NAME ?? 'reddit-actions',
  defaultPersona: process.env.DEFAULT_PERSONA ?? 'helpful_redditor',
  defaultReplyDelayMs: parseNumber(process.env.DEFAULT_REPLY_DELAY_MS, 120000),
  rateLimitUtilizationTarget: parseNumber(process.env.RATE_LIMIT_UTILIZATION_TARGET, 0.8),
  redditRequestsPerMinute: parseNumber(process.env.REDDIT_REQUESTS_PER_MINUTE, 30),
  sheetsRequestsPerMinute: parseNumber(process.env.SHEETS_REQUESTS_PER_MINUTE, 60),
  llmRequestsPerMinute: parseNumber(process.env.LLM_REQUESTS_PER_MINUTE, 30),
  groqApiKeys: parseGroqKeys(),
  groqLightweightModel:
    process.env.GROQ_MODEL_LIGHTWEIGHT ??
    process.env.GROQ_MODEL_LIGHT ??
    process.env.GROQ_MODEL ??
    'llama-3.1-8b-instant',
  groqComplexModel:
    process.env.GROQ_MODEL_COMPLEX ??
    process.env.GROQ_MODEL_HEAVY ??
    process.env.GROQ_MODEL ??
    'llama-3.3-70b-versatile',
  groqComplexPromptThresholdChars: parseNumber(process.env.GROQ_COMPLEX_PROMPT_THRESHOLD_CHARS, 600),
  groqMaxRetries: parseNumber(process.env.GROQ_MAX_RETRIES, 8),
  groqBaseRetryMs: parseNumber(process.env.GROQ_BASE_RETRY_MS, 800),
  analyticsCacheTtlSec: parseNumber(process.env.ANALYTICS_CACHE_TTL_SEC, 120),
  viralPeakThreshold: parseNumber(process.env.VIRAL_PEAK_THRESHOLD, 0.7),
  enableSheetsSync: parseBoolean(process.env.ENABLE_SHEETS_SYNC, true),
  googleSheetsWebhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL,
  googleSheetsSpreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  googleSheetsSyncTimeoutMs: parseNumber(process.env.GOOGLE_SHEETS_SYNC_TIMEOUT_MS, 15000)
};
