import 'server-only';
import type { RateLimiter, RateLimitOptions, RateLimitResult } from '../rate-limit.interface';
import { serverEnv } from '@/lib/config/server-env';

/**
 * Upstash Redis (REST) rate limiter — PREFERRED for production (distributed,
 * atomic, works across multiple serverless instances).
 *
 * The @upstash/redis dependency is intentionally NOT installed in Phase 1 to
 * keep the attack surface / dependency count small. This provider talks to the
 * Upstash REST API directly with fetch (an atomic INCR + PEXPIRE pipeline), so
 * it needs no npm dependency. Selected via RATE_LIMIT_PROVIDER=upstash once the
 * deployment architecture and Upstash credentials are confirmed.
 */
export class UpstashRateLimiter implements RateLimiter {
  readonly name = 'upstash';
  private readonly url: string;
  private readonly token: string;

  constructor() {
    const env = serverEnv();
    this.url = env.UPSTASH_REDIS_REST_URL;
    this.token = env.UPSTASH_REDIS_REST_TOKEN;
    if (!this.url || !this.token) {
      throw new Error('Upstash rate limiter selected but credentials are not configured.');
    }
  }

  async limit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const now = Date.now();
    const redisKey = `rl:${key}`;
    // Atomic pipeline: INCR then set expiry only on first hit.
    const body = JSON.stringify([
      ['INCR', redisKey],
      ['PEXPIRE', redisKey, String(options.windowMs), 'NX'],
      ['PTTL', redisKey],
    ]);
    const res = await fetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) {
      // Fail-safe policy: on limiter backend failure, do NOT hard-block traffic;
      // allow the request but surface remaining=0 so callers can log/monitor.
      return { success: true, limit: options.limit, remaining: 0, reset: now + options.windowMs };
    }
    const results = (await res.json()) as Array<{ result: number }>;
    const count = Number(results[0]?.result ?? 1);
    const pttl = Number(results[2]?.result ?? options.windowMs);
    const reset = now + (pttl > 0 ? pttl : options.windowMs);
    return {
      success: count <= options.limit,
      limit: options.limit,
      remaining: Math.max(0, options.limit - count),
      reset,
    };
  }
}
