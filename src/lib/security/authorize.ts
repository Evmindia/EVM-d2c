/**
 * Authorization guards: roles, permissions, and resource ownership (IDOR).
 *
 * Pure functions (no I/O) so they are trivially unit-testable and reusable in
 * both route handlers and services. Every guard throws a safe `forbidden`
 * AppError on failure and returns void on success.
 */
import { AppError } from '@/lib/security/errors';
import type { Principal, Permission, Role } from '@/types/domain';
import { isAdminRole, isStaffRole } from '@/types/domain';

/** Require the principal to be an admin or superadmin. */
export function requireAdmin(principal: Principal): void {
  if (!isAdminRole(principal.role)) {
    throw new AppError('forbidden', { internal: `role=${principal.role} is not admin` });
  }
}

/** Require the principal to be staff (admin, superadmin, or warehouse). */
export function requireStaff(principal: Principal): void {
  if (!isStaffRole(principal.role)) {
    throw new AppError('forbidden', { internal: `role=${principal.role} is not staff` });
  }
}

/** Require access to order fulfillment (admin, superadmin, or warehouse). */
export function requireOrderAccess(principal: Principal): void {
  requireStaff(principal);
}

/** Require the principal to be a superadmin. */
export function requireSuperadmin(principal: Principal): void {
  if (principal.role !== 'superadmin') {
    throw new AppError('forbidden', { internal: `role=${principal.role} is not superadmin` });
  }
}

/** Require a specific role exactly. */
export function requireRole(principal: Principal, role: Role): void {
  if (principal.role !== role) {
    throw new AppError('forbidden', { internal: `role=${principal.role} != ${role}` });
  }
}

/** Require a specific fine-grained permission. */
export function requirePermission(principal: Principal, permission: Permission): void {
  // superadmin implicitly holds all permissions.
  if (principal.role === 'superadmin') return;
  if (!principal.permissions.includes(permission)) {
    throw new AppError('forbidden', { internal: `missing permission ${permission}` });
  }
}

/**
 * Ownership check — the core IDOR guard. The resource's owner uid is compared
 * against the VERIFIED principal uid (derived from the token, never the body).
 * Admins may be allowed to bypass when `adminOverride` is true (e.g. admin APIs).
 */
export function requireOwnership(
  principal: Principal,
  resourceOwnerUid: string,
  opts: { adminOverride?: boolean } = {},
): void {
  if (opts.adminOverride && isAdminRole(principal.role)) return;
  if (principal.uid !== resourceOwnerUid) {
    throw new AppError('forbidden', { internal: 'ownership check failed' });
  }
}
