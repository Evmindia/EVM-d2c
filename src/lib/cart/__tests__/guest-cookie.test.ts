import { describe, it, expect } from 'vitest';
import {
  newGuestToken,
  isValidGuestToken,
  guestTokenHash,
  GUEST_COOKIE,
} from '@/lib/cart/guest-cookie';

describe('guest cart token', () => {
  it('generates a 256-bit (64 hex char) unguessable token', () => {
    const a = newGuestToken();
    const b = newGuestToken();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(b); // random, not sequential/predictable
  });

  it('validates token shape and rejects tampered values', () => {
    expect(isValidGuestToken(newGuestToken())).toBe(true);
    expect(isValidGuestToken('short')).toBe(false);
    expect(isValidGuestToken('g'.repeat(63))).toBe(false);
    expect(isValidGuestToken('Z'.repeat(64))).toBe(false); // non-hex
    expect(isValidGuestToken(undefined)).toBe(false);
    expect(isValidGuestToken('../../etc/passwd')).toBe(false);
  });

  it('derives a stable, non-reversible storage hash (raw token never a doc id)', () => {
    const token = newGuestToken();
    const h1 = guestTokenHash(token);
    const h2 = guestTokenHash(token);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    expect(h1).not.toBe(token); // stored key differs from the secret capability
  });

  it('uses a stable cookie name', () => {
    expect(GUEST_COOKIE).toBe('evm_cart');
  });
});
