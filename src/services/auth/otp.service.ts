import 'server-only';

/**
 * Phone OTP service — server-authoritative. Generates a 6-digit code, stores only
 * its HASH (never plaintext) in the server-only `phone_otps` collection with a
 * short TTL, and verifies with attempt + resend limits. The code is delivered via
 * the Kapsystem SMS gateway and is never returned in any API response or log.
 */
import { createHash, randomInt } from 'node:crypto';
import { adminDb } from '@/lib/firebase/admin';
import { AppError } from '@/lib/security/errors';
import { sendOtpSms } from '@/lib/sms/kapsystem';

const COLLECTION = 'phone_otps';
const OTP_TTL_MS = 5 * 60 * 1000; // code valid 5 min
const RESEND_COOLDOWN_MS = 30 * 1000; // min gap between sends
const SEND_WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_ATTEMPTS = 5;

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
function docId(phoneE164: string): string {
  return sha256(phoneE164); // avoid storing raw phone as the doc id
}
function codeHash(phoneE164: string, code: string): string {
  return sha256(`${phoneE164}:${code}`);
}
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

interface OtpDoc {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  windowStart: number;
  sendCount: number;
}

/** Generate + SMS an OTP for a phone. Enforces resend cooldown + window cap. */
export async function requestOtp(phoneE164: string): Promise<void> {
  const ref = adminDb().collection(COLLECTION).doc(docId(phoneE164));
  const now = Date.now();
  const snap = await ref.get();
  const data = snap.exists ? (snap.data() as OtpDoc) : null;

  if (data && now - data.lastSentAt < RESEND_COOLDOWN_MS) {
    throw new AppError('rate_limited', { internal: 'otp resend cooldown' });
  }
  let windowStart = data?.windowStart ?? now;
  let sendCount = data?.sendCount ?? 0;
  if (now - windowStart > SEND_WINDOW_MS) {
    windowStart = now;
    sendCount = 0;
  }
  if (sendCount >= MAX_SENDS_PER_WINDOW) {
    throw new AppError('rate_limited', { internal: 'otp send window cap' });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const next: OtpDoc = {
    codeHash: codeHash(phoneE164, code),
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: now,
    windowStart,
    sendCount: sendCount + 1,
  };
  await ref.set(next);
  await sendOtpSms(phoneE164, code); // throws on failure (code never logged)
}

/** Verify an OTP. Returns true on match; increments attempts on mismatch. */
export async function verifyOtp(phoneE164: string, code: string): Promise<boolean> {
  const ref = adminDb().collection(COLLECTION).doc(docId(phoneE164));
  const snap = await ref.get();
  if (!snap.exists) return false;
  const d = snap.data() as OtpDoc;

  if (Date.now() > d.expiresAt || d.attempts >= MAX_ATTEMPTS) {
    await ref.delete();
    return false;
  }
  if (!timingSafeEqualHex(codeHash(phoneE164, code), d.codeHash)) {
    await ref.update({ attempts: d.attempts + 1 });
    return false;
  }
  return true;
}

/** Consumes the OTP after the custom token and session have been successfully created. */
export async function consumeOtp(phoneE164: string): Promise<void> {
  const ref = adminDb().collection(COLLECTION).doc(docId(phoneE164));
  await ref.delete().catch(() => {});
}
