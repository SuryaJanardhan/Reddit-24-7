export class ChannelRateLimiter {
  private readonly minIntervalMs: number;
  private nextAvailableAt = 0;

  constructor(requestsPerMinute: number, utilizationTarget: number) {
    const safeRpm = Math.max(1, Math.floor(requestsPerMinute));
    const safeUtilization = Math.min(1, Math.max(0.1, utilizationTarget));
    const effectiveRpm = Math.max(1, Math.floor(safeRpm * safeUtilization));

    this.minIntervalMs = Math.ceil(60000 / effectiveRpm);
  }

  reserveDelayMs(now = Date.now()): number {
    if (now >= this.nextAvailableAt) {
      this.nextAvailableAt = now + this.minIntervalMs;
      return 0;
    }

    const delayMs = this.nextAvailableAt - now;
    this.nextAvailableAt += this.minIntervalMs;
    return delayMs;
  }
}
