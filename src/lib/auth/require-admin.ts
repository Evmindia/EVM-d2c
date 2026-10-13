import 'server-only';

/**
 * Centralized admin authorization for admin API routes. Every admin endpoint
 * uses these helpers so authorization logic is never duplicated per route.
 *
 * Identity + privilege are ALWAYS derived from the cryptographically verified
 * Firebase token/session and its CUSTOM CLAIMS (role/permissions) — never from a
 * request body, header, query param, or UI state. Custom claims can only be set
 * by trusted server code, so a customer can never self-elevate to admin.
 */
import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/security/auth';
import {
  requireAdmin as assertAdmin,
  requireSuperadmin as assertSuperadmin,
  requireStaff as assertStaff,
} from '@/lib/security/authorize';
import type { Principal } from '@/types/domain';

/** Verify the caller and require an ADMIN (or SUPER_ADMIN) role. */
export async function requireAdmin(req: NextRequest): Promise<Principal> {
  const principal = await authenticate(req); // 401 unauthenticated / token_invalid
  assertAdmin(principal); // 403 forbidden if not admin/superadmin
  return principal;
}

/** Verify the caller and require SUPER_ADMIN. */
export async function requireSuperadmin(req: NextRequest): Promise<Principal> {
  const principal = await authenticate(req);
  assertSuperadmin(principal);
  return principal;
}

/** Verify the caller and require staff order access (admin, superadmin, or warehouse). */
export async function requireOrderStaff(req: NextRequest): Promise<Principal> {
  const principal = await authenticate(req);
  assertStaff(principal);
  return principal;
}
