import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { parseJsonBody } from '@/lib/security/validate';
import { enforceRateLimit } from '@/lib/security/rate-limit/rate-limit.service';
import { requestOtp, isWhitelistedPhone } from '@/services/auth/otp.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/otp/send { phone } — generate + SMS a login OTP. */
const bodySchema = z.object({ phone: z.string().min(8).max(16) }).strict();

/** Normalize an Indian mobile to E.164 (+91XXXXXXXXXX); accepts +CC… as-is. */
function toE164(raw: string): string {
  const t = raw.trim().replace(/[\s-]/g, '');
  if (t.startsWith('+')) return t;
  return `+91${t.replace(/\D/g, '').slice(-10)}`;
}

export const POST = route(
  async ({ req, clientKey }) => {
    const body = await parseJsonBody(req, bodySchema);
    const phone = toE164(body.phone);
    if (!/^\+\d{11,15}$/.test(phone)) {
      throw new AppError('bad_request', {
        message: 'Please enter a valid mobile number.',
        internal: 'invalid phone',
      });
    }

    // Rate-limit by client IP for public requests; whitelisted audit numbers bypass
    if (!isWhitelistedPhone(phone)) {
      await enforceRateLimit('auth_signup', clientKey);
    }

    await requestOtp(phone);
    return ok({ sent: true });
  },
  { sameOrigin: true },
);
