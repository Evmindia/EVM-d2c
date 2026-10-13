import type { RateLimiter, RateLimitOptions, RateLimitResult } from '../rate-limit.interface';

/**
 * In-memory fixed-window limiter.
 *
 * Default for development and tests — NO external infrastructure required.
 * NOT suitable for multi-instance production (state is per-process); production
 * should use the Upstash provider. Selected via RATE_LIMIT_PROVIDER=memory.
 */
interface Bucket {
  count: number;
  reset: number;
}

export class MemoryRateLimiter implements RateLimiter {
  readonly name = 'memory';
  private readonly store = new Map<string, Bucket>();

  async limit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || existing.reset <= now) {
      const reset = now + options.windowMs;
      this.store.set(key, { count: 1, reset });
      return { success: true, limit: options.limit, remaining: options.limit - 1, reset };
    }

    existing.count += 1;
    const remaining = Math.max(0, options.limit - existing.count);
    return {
      success: existing.count <= options.limit,
      limit: options.limit,
      remaining,
      reset: existing.reset,
    };
  }

  /** Test helper to reset internal state. */
  _clear(): void {
    this.store.clear();
  }
}
