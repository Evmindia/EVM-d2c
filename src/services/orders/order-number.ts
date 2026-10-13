import { randomBytes } from 'node:crypto';

/**
 * Customer-facing order number generation.
 *
 * Format: EVM-XXXXXXXX where X is Crockford base32 (no ambiguous I/L/O/U). The
 * value is derived from CSPRNG bytes — NON-sequential and unguessable, so it
 * cannot be enumerated (EVM-100001, EVM-100002, ...). It is distinct from the
 * internal Firestore document id.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32
const LENGTH = 8;

export function generateOrderNumber(): string {
  const bytes = randomBytes(LENGTH);
  let out = '';
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `EVM-${out}`;
}

/** Validate a customer-facing order number reference (before any lookup). */
export function isValidOrderNumber(ref: string): boolean {
  return /^EVM-[0-9A-HJKMNP-TV-Z]{8}$/.test(ref);
}
