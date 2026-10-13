import 'server-only';
import type { RateLimiter } from './rate-limit.interface';
import { MemoryRateLimiter } from './providers/memory';
import { serverEnv } from '@/lib/config/server-env';

/**
 * Factory: selects the active rate-limit backend from RATE_LIMIT_PROVIDER.
 * Upstash (preferred prod) and Firestore (fallback) are lazily imported so
 * their server-only code and any related config are never pulled in unless
 * actually selected — keeping the default (memory) dependency-free.
 */
let cached: RateLimiter | null = null;

export async function getRateLimiter(): Promise<RateLimiter> {
  if (cached) return cached;
  const provider = serverEnv().RATE_LIMIT_PROVIDER;

  switch (provider) {
    case 'upstash': {
      const { UpstashRateLimiter } = await import('./providers/upstash');
      cached = new UpstashRateLimiter();
      break;
    }
    case 'firestore': {
      const { FirestoreRateLimiter } = await import('./providers/firestore');
      cached = new FirestoreRateLimiter();
      break;
    }
    case 'memory':
    default:
      cached = new MemoryRateLimiter();
      break;
  }
  return cached;
}

/** Test helper to reset the cached singleton. */
export function _resetRateLimiter(): void {
  cached = null;
}
