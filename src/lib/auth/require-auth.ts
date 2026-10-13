import 'server-only';

/**
 * Authorization entry points for account/customer endpoints.
 *
 * These wrap the verified-identity core (lib/security/auth.ts). Identity is
 * ALWAYS derived from the cryptographically verified Firebase token/session —
 * never from a client-supplied uid/email/role.
 */
import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/security/auth';
import type { Principal } from '@/types/domain';

/** Require any authenticated identity. Throws unauthenticated/token_invalid. */
export async function requireAuth(req: NextRequest): Promise<Principal> {
  return authenticate(req);
}

/**
 * Require an authenticated CUSTOMER identity. (Admins are also authenticated
 * users; account endpoints operate on the caller's own resources regardless of
 * role, so any verified user is accepted here. Admin-only APIs use requireAdmin.)
 */
export async function requireUser(req: NextRequest): Promise<Principal> {
  return authenticate(req);
}
