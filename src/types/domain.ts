/**
 * Shared domain types for the EVM D2C platform.
 * These describe the security-relevant identity model used across services.
 * Product/order/etc. domain shapes are added in later phases.
 */

export type Role = 'customer' | 'admin' | 'superadmin' | 'warehouse';

/** Fine-grained permissions for sensitive operations (superadmin gates). */
export type Permission =
  | 'orders:read'
  | 'orders:update'
  | 'orders:cancel'
  | 'payments:read'
  | 'refunds:create' // superadmin
  | 'coupons:create' // superadmin
  | 'products:write'
  | 'inventory:write'
  | 'users:manage' // superadmin
  | 'roles:manage'; // superadmin

/**
 * A verified principal, resolved SERVER-SIDE from a Firebase Auth token's
 * custom claims. The client never supplies uid/role/permissions authoritatively.
 */
export interface Principal {
  uid: string;
  email: string | null;
  role: Role;
  permissions: Permission[];
  /** True when the token was verified with checkRevoked. */
  verified: true;
}

/** Anonymous/guest principal for public endpoints and guest checkout. */
export interface GuestPrincipal {
  uid: null;
  role: 'guest';
  guestId?: string;
}

export type MaybePrincipal = Principal | GuestPrincipal;

export function isAuthenticated(p: MaybePrincipal): p is Principal {
  return p.uid !== null;
}

export function isAdminRole(role: Role): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function isWarehouseRole(role: Role): boolean {
  return role === 'warehouse';
}

export function isStaffRole(role: Role): boolean {
  return isAdminRole(role) || role === 'warehouse';
}
