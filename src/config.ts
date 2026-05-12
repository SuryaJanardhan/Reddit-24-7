import dotenv from 'dotenv';

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
    process.env.GROQ_API_KEY_4
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
  groqModel: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
  groqMaxRetries: parseNumber(process.env.GROQ_MAX_RETRIES, 8),
  groqBaseRetryMs: parseNumber(process.env.GROQ_BASE_RETRY_MS, 800)
};
