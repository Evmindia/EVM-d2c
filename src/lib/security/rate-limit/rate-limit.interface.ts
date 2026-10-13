/**
 * Provider-agnostic rate limiting contract.
 *
 * Application code depends ONLY on this interface (via rate-limit.service.ts),
 * never on a concrete backend. The production provider (Upstash Redis preferred)
 * is chosen through configuration (RATE_LIMIT_PROVIDER). This keeps the app
 * decoupled from Upstash/Firestore and makes swapping backends a config change.
 */

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether this request is allowed. */
  success: boolean;
  /** Configured limit for the window. */
  limit: number;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Epoch ms when the window resets. */
  reset: number;
}

export interface RateLimiter {
  /** A stable identifier for the backend (for diagnostics/logging). */
  readonly name: string;
  /**
   * Consume one unit for `key` under the given options.
   * Implementations MUST be atomic enough to be safe under concurrency for the
   * chosen backend (Upstash uses an atomic INCR; Firestore uses a transaction).
   */
  limit(key: string, options: RateLimitOptions): Promise<RateLimitResult>;
}
