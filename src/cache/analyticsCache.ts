import IORedis from 'ioredis';

export class AnalyticsCache {
  private redis?: IORedis;

  constructor(redisUrl: string | undefined, private readonly ttlSec: number) {
    if (redisUrl) {
      this.redis = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.redis) {
      return undefined;
    }

    const payload = await this.redis.get(key);
    if (!payload) {
      return undefined;
    }

    try {
      return JSON.parse(payload) as T;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.redis) {
      return;
    }

    await this.redis.set(key, JSON.stringify(value), 'EX', Math.max(30, this.ttlSec));
  }

  async close(): Promise<void> {
    await this.redis?.quit();
  }
}
