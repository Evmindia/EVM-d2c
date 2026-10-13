import { route, ok } from '@/app/api/_lib/handler';
import { authenticateOptional } from '@/lib/security/auth';
import { isAuthenticated } from '@/types/domain';
import { SESSION_COOKIE, clearedSessionCookieOptions, revokeSessions } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/logout — clear the session cookie and revoke refresh tokens.
 *
 * Server-side invalidation: after revokeRefreshTokens, the existing session
 * cookie stops verifying (verifySessionCookie uses checkRevoked). We do not rely
 * on client-only state. Safe to call when already logged out.
 */
export const POST = route(
  async ({ req }) => {
    const principal = await authenticateOptional(req).catch(() => null);
    if (principal && isAuthenticated(principal)) {
      try {
        await revokeSessions(principal.uid);
      } catch (err) {
        logger.warn('logout_revoke_failed', { err: String(err) });
      }
      logger.info('auth_logout', { uid: principal.uid });
    }
    const res = ok({ loggedOut: true });
    res.cookies.set(SESSION_COOKIE, '', clearedSessionCookieOptions);
    return res;
  },
  { sameOrigin: true },
);
