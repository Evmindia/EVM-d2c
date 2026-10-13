import 'server-only';

/**
 * Request authentication. Identity is derived SERVER-SIDE from a verified
 * Firebase token — never from client-supplied uid/role/permissions.
 *
 * Supports both `Authorization: Bearer <idToken>` and a Firebase session cookie.
 * Tokens are verified with checkRevoked=true so logout / revocation is honored.
 */
import type { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { AppError } from '@/lib/security/errors';
import type { Principal, GuestPrincipal, MaybePrincipal, Role, Permission } from '@/types/domain';

const SESSION_COOKIE = '__session';

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
  return value.trim();
}

function principalFromClaims(claims: {
  uid: string;
  email?: string;
  role?: unknown;
  permissions?: unknown;
}): Principal {
  // Role/permissions come from trusted custom claims ONLY.
  const role: Role =
    claims.role === 'admin' || claims.role === 'superadmin' || claims.role === 'warehouse'
      ? claims.role
      : 'customer';
  const permissions: Permission[] = Array.isArray(claims.permissions)
    ? (claims.permissions.filter((p) => typeof p === 'string') as Permission[])
    : [];
  return {
    uid: claims.uid,
    email: claims.email ?? null,
    role,
    permissions,
    verified: true,
  };
}

/**
 * Authenticate a request. Throws `unauthenticated`/`token_expired`/
 * `token_invalid` on failure. Use `authenticateOptional` for guest-friendly
 * endpoints.
 */
export async function authenticate(req: NextRequest): Promise<Principal> {
  const token = bearerToken(req);
  const cookie = req.cookies.get(SESSION_COOKIE)?.value ?? null;

  if (!token && !cookie) {
    throw new AppError('unauthenticated');
  }

  try {
    const auth = adminAuth();
    const decoded = token
      ? await auth.verifyIdToken(token, true)
      : await auth.verifySessionCookie(cookie!, true);
    return principalFromClaims({
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    });
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
    if (code.includes('expired')) {
      throw new AppError('token_expired', { internal: code });
    }
    if (code.includes('revoked')) {
      throw new AppError('token_invalid', { internal: code });
    }
    throw new AppError('token_invalid', { internal: err });
  }
}

/** Authenticate if a token/cookie is present; otherwise return a guest. */
export async function authenticateOptional(req: NextRequest): Promise<MaybePrincipal> {
  const hasCredential =
    Boolean(bearerToken(req)) || Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (!hasCredential) {
    const guest: GuestPrincipal = { uid: null, role: 'guest' };
    return guest;
  }
  return authenticate(req);
}
