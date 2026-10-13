import 'server-only';
import type { RateLimiter, RateLimitOptions, RateLimitResult } from '../rate-limit.interface';
import { adminDb } from '@/lib/firebase/admin';

/**
 * Firestore-backed rate limiter — FALLBACK only.
 *
 * Use only when a distributed cache (Upstash) is not available. Firestore is not
 * ideal as a primary rate limiter (cost + write latency), so this exists for
 * completeness and portability, selected via RATE_LIMIT_PROVIDER=firestore.
 * Counts live in the server-only `rate_limits` collection and are updated in a
 * transaction to remain safe under concurrency.
 */
export class FirestoreRateLimiter implements RateLimiter {
  readonly name = 'firestore';

  async limit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const db = adminDb();
    const now = Date.now();
    const ref = db.collection('rate_limits').doc(encodeURIComponent(key));

    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? (snap.data() as { count: number; reset: number }) : null;

      if (!data || data.reset <= now) {
        const reset = now + options.windowMs;
        tx.set(ref, { count: 1, reset });
        return { success: true, limit: options.limit, remaining: options.limit - 1, reset };
      }

      const count = data.count + 1;
      tx.set(ref, { count, reset: data.reset }, { merge: true });
      return {
        success: count <= options.limit,
        limit: options.limit,
        remaining: Math.max(0, options.limit - count),
        reset: data.reset,
      };
    });
  }
}
