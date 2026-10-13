import 'server-only';
import { getRateLimiter } from './index';
import type { RateLimitOptions, RateLimitResult } from './rate-limit.interface';
import { AppError } from '@/lib/security/errors';

/**
 * The generic rate-limit service the rest of the application calls.
 * Callers never touch a specific provider — only this service.
 *
 * Named policies keep limits consistent and tunable in one place. Public and
 * abuse-prone endpoints (checkout, payment verify, reviews, support, auth,
 * search) get tighter limits in their respective phases.
 */
export type RateLimitPolicy =
  | 'public'
  | 'auth'
  | 'checkout'
  | 'payment'
  | 'review'
  | 'support'
  | 'search'
  | 'admin'
  | 'cart_read'
  | 'cart_write'
  | 'cart_merge'
  | 'order_read'
  | 'order_write'
  | 'auth_login'
  | 'auth_signup'
  | 'auth_password_reset'
  | 'auth_profile_write'
  | 'auth_address_write'
  | 'auth_account_read'
  | 'payment_create'
  | 'payment_verify'
  | 'payment_retry'
  | 'payment_status'
  | 'admin_read'
  | 'admin_write'
  | 'admin_search'
  | 'admin_sensitive_action';

const POLICIES: Record<RateLimitPolicy, RateLimitOptions> = {
  public: { limit: 100, windowMs: 60_000 },
  auth: { limit: 10, windowMs: 60_000 },
  checkout: { limit: 15, windowMs: 60_000 },
  payment: { limit: 20, windowMs: 60_000 },
  review: { limit: 5, windowMs: 60_000 },
  support: { limit: 5, windowMs: 60_000 },
  search: { limit: 30, windowMs: 60_000 },
  admin: { limit: 120, windowMs: 60_000 },
  // Cart: reads are frequent (page loads); writes/merge are tighter to curb abuse.
  cart_read: { limit: 60, windowMs: 60_000 },
  cart_write: { limit: 30, windowMs: 60_000 },
  cart_merge: { limit: 10, windowMs: 60_000 },
  // Checkout/order: order creation is sensitive -> tighter.
  order_read: { limit: 40, windowMs: 60_000 },
  order_write: { limit: 10, windowMs: 60_000 },
  // Auth: brute-force-sensitive endpoints get tight limits.
  auth_login: { limit: 10, windowMs: 60_000 },
  auth_signup: { limit: 5, windowMs: 60_000 },
  auth_password_reset: { limit: 5, windowMs: 60_000 },
  auth_profile_write: { limit: 20, windowMs: 60_000 },
  auth_address_write: { limit: 20, windowMs: 60_000 },
  auth_account_read: { limit: 60, windowMs: 60_000 },
  // Payment: sensitive; tight limits. (The webhook is NOT rate-limited here —
  // signature verification + idempotency are its protections — to avoid
  // blocking legitimate provider retries.)
  payment_create: { limit: 15, windowMs: 60_000 },
  payment_verify: { limit: 20, windowMs: 60_000 },
  payment_retry: { limit: 10, windowMs: 60_000 },
  payment_status: { limit: 60, windowMs: 60_000 },
  // Admin: reads generous; writes/sensitive actions tighter. Keyed per client.
  admin_read: { limit: 120, windowMs: 60_000 },
  admin_write: { limit: 40, windowMs: 60_000 },
  admin_search: { limit: 60, windowMs: 60_000 },
  admin_sensitive_action: { limit: 20, windowMs: 60_000 },
};

/**
 * Check a rate-limit policy for an identity key (IP and/or uid). Returns the
 * result; does not throw. Use `enforceRateLimit` to throw on breach.
 */
export async function checkRateLimit(
  policy: RateLimitPolicy,
  identityKey: string,
): Promise<RateLimitResult> {
  const limiter = await getRateLimiter();
  const options = POLICIES[policy];
  return limiter.limit(`${policy}:${identityKey}`, options);
}

/** Enforce a policy; throws a safe `rate_limited` AppError when exceeded. */
export async function enforceRateLimit(
  policy: RateLimitPolicy,
  identityKey: string,
): Promise<RateLimitResult> {
  const result = await checkRateLimit(policy, identityKey);
  if (!result.success) {
    throw new AppError('rate_limited', {
      internal: { policy, identityKey, reset: result.reset },
    });
  }
  return result;
}

export const _policiesForTest = POLICIES;
