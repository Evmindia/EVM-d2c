import 'server-only';

/**
 * Session cookie management (Firebase session cookies).
 *
 * Browser auth flow:
 *   1. Client signs in with the Firebase JS SDK (email/password) and obtains an
 *      ID token.
 *   2. Client POSTs the ID token to /api/auth/session.
 *   3. Server verifies the ID token, mints a Firebase SESSION COOKIE via the
 *      Admin SDK, and sets it as an httpOnly cookie named `__session`.
 *   4. Every protected request is authenticated by verifying `__session`
 *      server-side (see lib/security/auth.ts -> verifySessionCookie, checkRevoked).
 *
 * No token is stored in localStorage. Logout revokes refresh tokens so the
 * session cookie stops verifying on the next request.
 */
import { adminAuth } from '@/lib/firebase/admin';
import { isProduction } from '@/lib/config/env';

export const SESSION_COOKIE = '__session';

/** Session lifetime: 5 days (Firebase allows up to 14). */
const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
};

export const clearedSessionCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 0,
};

/**
 * Verify an ID token and create a session cookie value. Returns the cookie
 * value + the verified uid. Throws if the ID token is invalid/expired.
 */
export async function createSession(idToken: string): Promise<{
  cookie: string;
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
}> {
  const auth = adminAuth();
  // Verify the ID token first (checkRevoked) so we never mint a session from a
  // forged/expired token.
  const decoded = await auth.verifyIdToken(idToken, true);
  const cookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
  return {
    cookie,
    uid: decoded.uid,
    email: typeof decoded.email === 'string' ? decoded.email : '',
    emailVerified: Boolean(decoded.email_verified),
    displayName: typeof decoded.name === 'string' ? decoded.name : '',
  };
}

/** Revoke all refresh tokens for a user (used on logout). */
export async function revokeSessions(uid: string): Promise<void> {
  await adminAuth().revokeRefreshTokens(uid);
}
