import 'server-only';

/**
 * Guest cart identification via a cryptographically secure, httpOnly cookie.
 *
 * - The token is 256 bits of randomness (unguessable) — no email/phone/sequential
 *   ids, so guest carts cannot be enumerated or taken over by guessing.
 * - Stored in an httpOnly cookie (NOT localStorage), so page scripts / XSS can't
 *   read it, and it survives reloads.
 * - The cart document is keyed by sha256(token); the raw token (the capability)
 *   never appears in a document id or is returned to the client.
 */
import { randomBytes, createHash } from 'node:crypto';
import { isProduction } from '@/lib/config/env';

export const GUEST_COOKIE = 'evm_cart';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Generate a new secure guest token (hex, 64 chars). */
export function newGuestToken(): string {
  return randomBytes(32).toString('hex');
}

/** Basic shape check to reject tampered/garbage cookie values before use. */
export function isValidGuestToken(token: string | undefined | null): token is string {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}

/** Derive the (non-secret) storage key from the secret token. */
export function guestTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const guestCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: THIRTY_DAYS,
};
