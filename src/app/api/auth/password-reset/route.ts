import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { parseJsonBody } from '@/lib/security/validate';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/password-reset — rate-limited, enumeration-safe entry point.
 *
 * The actual reset email is sent by the Firebase client SDK
 * (sendPasswordResetEmail) — we do NOT build custom reset tokens or store them.
 * This endpoint exists to apply OUR rate limiting + audit and to ALWAYS return a
 * generic success, so the response never reveals whether an email is registered.
 * The email address is not logged.
 */
const bodySchema = z.object({ email: z.string().trim().toLowerCase().max(254).email() }).strict();

export const POST = route(
  async ({ req }) => {
    // Validate shape but never disclose existence. Any outcome -> same response.
    await parseJsonBody(req, bodySchema).catch(() => null);
    logger.info('auth_password_reset_requested', {}); // no email/PII logged
    return ok({ ok: true });
  },
  { rateLimit: 'auth_password_reset', sameOrigin: true },
);
