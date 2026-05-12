import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

interface QueueJob<T> {
  name: string;
  data: T;
  delayMs?: number;
}

export class QueueService<T extends object> {
  private queue?: Queue<T, any, string>;
  private worker?: Worker<T, any, string>;
  private onJob: (data: T) => Promise<void>;

  constructor(
    private readonly queueName: string,
    redisUrl: string | undefined,
    onJob: (data: T) => Promise<void>
  ) {
    this.onJob = onJob;

    if (redisUrl) {
      const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
      this.queue = new Queue<T, any, string>(queueName, { connection });
      this.worker = new Worker<T, any, string>(
        queueName,
        async (job) => {
          await this.onJob(job.data);
        },
        { connection }
      );
    }
  }

  async enqueue(job: QueueJob<T>): Promise<void> {
    if (this.queue) {
      await this.queue.add(job.name as any, job.data as any, { delay: job.delayMs });
      return;
    }

    setTimeout(() => {
      void this.onJob(job.data);
    }, job.delayMs ?? 0);
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
