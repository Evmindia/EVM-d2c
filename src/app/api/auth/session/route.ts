import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { parseJsonBody } from '@/lib/security/validate';
import { enforceRateLimit } from '@/lib/security/rate-limit/rate-limit.service';
import { safeText } from '@/lib/security/validate';
import { createSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { ensureProfile } from '@/services/users/user.service';
import { recordAudit } from '@/lib/audit/audit';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/session — establish a server session from a Firebase ID token.
 *
 * Called by the client after a successful Firebase sign-in (login OR signup).
 * The server verifies the ID token, mints an httpOnly session cookie, and
 * creates/updates the Firestore profile from the VERIFIED identity. The ID token
 * is never logged. `displayName` is an optional signup convenience only.
 */
const bodySchema = z
  .object({
    idToken: z.string().min(20).max(4096),
    mode: z.enum(['login', 'signup']).default('login'),
    displayName: safeText(120).optional(),
  })
  .strict();

export const POST = route(
  async ({ req, clientKey }) => {
    const body = await parseJsonBody(req, bodySchema);
    // Rate-limit by intent (signup is tighter than login).
    await enforceRateLimit(body.mode === 'signup' ? 'auth_signup' : 'auth_login', clientKey);

    const session = await createSession(body.idToken);
    const profile = await ensureProfile({
      uid: session.uid,
      email: session.email,
      emailVerified: session.emailVerified,
      displayName: body.displayName || session.displayName || undefined,
    });

    await recordAudit({
      action: 'admin.login', // reused generic auth event; resourceType distinguishes
      actorUid: session.uid,
      actorRole: 'customer',
      resourceType: 'auth',
      metadata: { event: body.mode === 'signup' ? 'signup' : 'login_success' },
    });
    logger.info('auth_session_created', { uid: session.uid, mode: body.mode });

    const res = ok({ emailVerified: profile.emailVerified });
    res.cookies.set(SESSION_COOKIE, session.cookie, sessionCookieOptions);
    return res;
  },
  { sameOrigin: true },
);
