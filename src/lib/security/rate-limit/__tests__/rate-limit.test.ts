import { describe, it, expect } from 'vitest';
import { MemoryRateLimiter } from '@/lib/security/rate-limit/providers/memory';

describe('rate limiting (memory provider)', () => {
  it('allows up to the limit then blocks within the window', async () => {
    const rl = new MemoryRateLimiter();
    const opts = { limit: 3, windowMs: 60_000 };
    const results = [];
    for (let i = 0; i < 4; i++) {
      results.push(await rl.limit('ip:1.2.3.4', opts));
    }
    expect(results.map((r) => r.success)).toEqual([true, true, true, false]);
    expect(results[3]!.remaining).toBe(0);
  });

  it('isolates keys from each other', async () => {
    const rl = new MemoryRateLimiter();
    const opts = { limit: 1, windowMs: 60_000 };
    expect((await rl.limit('a', opts)).success).toBe(true);
    expect((await rl.limit('a', opts)).success).toBe(false);
    // different key is unaffected
    expect((await rl.limit('b', opts)).success).toBe(true);
  });

  it('resets after the window elapses', async () => {
    const rl = new MemoryRateLimiter();
    const opts = { limit: 1, windowMs: 5 };
    expect((await rl.limit('k', opts)).success).toBe(true);
    expect((await rl.limit('k', opts)).success).toBe(false);
    await new Promise((r) => setTimeout(r, 10));
    expect((await rl.limit('k', opts)).success).toBe(true);
  });
});
