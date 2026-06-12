/**
 * Sliding-window rate limiter: at most `limit` events per `windowMs` per key.
 * The clock is injectable so tests can drive time deterministically.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Record an event for `key`; false when the key is over its budget. */
  allow(key: string): boolean {
    const cutoff = this.now() - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((at) => at > cutoff);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(this.now());
    this.hits.set(key, recent);
    return true;
  }

  /** Forget a key, e.g. when its connection goes away. */
  clear(key: string): void {
    this.hits.delete(key);
  }
}
