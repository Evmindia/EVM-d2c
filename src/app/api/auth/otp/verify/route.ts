import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { parseJsonBody } from '@/lib/security/validate';
import { enforceRateLimit } from '@/lib/security/rate-limit/rate-limit.service';
import { verifyOtp, consumeOtp, isWhitelistedPhone } from '@/services/auth/otp.service';
import { adminAuth } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/otp/verify { phone, code } — verify the OTP and return a Firebase
 * CUSTOM TOKEN. The client signs in with it, then exchanges the resulting ID token
 * at /api/auth/session for the httpOnly session cookie (same as every other flow).
 */
const bodySchema = z
  .object({ phone: z.string().min(8).max(16), code: z.string().regex(/^\d{4,8}$/) })
  .strict();

function toE164(raw: string): string {
  const t = raw.trim().replace(/[\s-]/g, '');
  if (t.startsWith('+')) return t;
  return `+91${t.replace(/\D/g, '').slice(-10)}`;
}

async function getOrCreatePhoneUser(auth: ReturnType<typeof adminAuth>, phone: string): Promise<string> {
  try {
    const user = await auth.getUserByPhoneNumber(phone);
    return user.uid;
  } catch (err: unknown) {
    const fbErr = err as { code?: string };
    if (fbErr?.code === 'auth/user-not-found') {
      try {
        const created = await auth.createUser({ phoneNumber: phone });
        return created.uid;
      } catch (createErr: unknown) {
        const createFbErr = createErr as { code?: string };
        if (createFbErr?.code === 'auth/phone-number-already-exists') {
          const user = await auth.getUserByPhoneNumber(phone);
          return user.uid;
        }
        throw createErr;
      }
    }
    try {
      const created = await auth.createUser({ phoneNumber: phone });
      return created.uid;
    } catch {
      const user = await auth.getUserByPhoneNumber(phone);
      return user.uid;
    }
  }
}

export const POST = route(
  async ({ req, clientKey }) => {
    const body = await parseJsonBody(req, bodySchema);
    const phone = toE164(body.phone);

    // Rate-limit by client IP for public requests; whitelisted audit numbers bypass
    if (!isWhitelistedPhone(phone)) {
      await enforceRateLimit('auth_login', clientKey);
    }

    const okCode = await verifyOtp(phone, body.code);
    if (!okCode) {
      throw new AppError('bad_request', {
        message: 'Invalid or expired OTP code. Please enter the correct code or request a new one.',
        internal: 'invalid or expired otp',
      });
    }

    // Get-or-create the Firebase user for this phone, then mint a custom token.
    const auth = adminAuth();
    const uid = await getOrCreatePhoneUser(auth, phone);

    let customToken: string;
    try {
      customToken = await auth.createCustomToken(uid);
    } catch (err) {
      logger.error('otp_custom_token_failed', { err: String(err) });
      throw new AppError('internal_error', { internal: 'Failed to mint session token for phone user.' });
    }

    // Consume the OTP only after successful token creation
    await consumeOtp(phone);

    logger.info('otp_verified', { uid });
    return ok({ customToken });
  },
  { sameOrigin: true },
);
