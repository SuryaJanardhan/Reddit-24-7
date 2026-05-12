import dotenv from 'dotenv';

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: parseNumber(process.env.PORT, 3000),
  redisUrl: process.env.REDIS_URL,
  queueName: process.env.QUEUE_NAME ?? 'reddit-actions',
  defaultPersona: process.env.DEFAULT_PERSONA ?? 'helpful_redditor',
  defaultReplyDelayMs: parseNumber(process.env.DEFAULT_REPLY_DELAY_MS, 120000)
};
