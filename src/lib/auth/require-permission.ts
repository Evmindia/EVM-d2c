import 'server-only';

/**
 * Require a specific fine-grained permission for a sensitive admin action.
 * The caller must be an admin AND hold the permission (SUPER_ADMIN implicitly
 * holds all). Permissions come only from verified custom claims.
 */
import type { NextRequest } from 'next/server';
import { authenticate } from '@/lib/security/auth';
import {
  requireAdmin as assertAdmin,
  requirePermission as assertPermission,
} from '@/lib/security/authorize';
import type { Principal, Permission } from '@/types/domain';

export async function requirePermission(
  req: NextRequest,
  permission: Permission,
): Promise<Principal> {
  const principal = await authenticate(req);
  assertAdmin(principal); // must be at least admin
  assertPermission(principal, permission); // and hold the specific permission
  return principal;
}
