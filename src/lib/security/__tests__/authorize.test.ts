import { describe, it, expect } from 'vitest';
import {
  requireAdmin,
  requireSuperadmin,
  requireStaff,
  requirePermission,
  requireOwnership,
} from '@/lib/security/authorize';
import { AppError } from '@/lib/security/errors';
import type { Principal } from '@/types/domain';

function principal(overrides: Partial<Principal> = {}): Principal {
  return {
    uid: 'u1',
    email: 'a@b.com',
    role: 'customer',
    permissions: [],
    verified: true,
    ...overrides,
  };
}

describe('authorization guards', () => {
  it('rejects a customer hitting an admin-only guard', () => {
    expect(() => requireAdmin(principal({ role: 'customer' }))).toThrowError(AppError);
  });

  it('allows admin and superadmin through requireAdmin, rejects warehouse', () => {
    expect(() => requireAdmin(principal({ role: 'admin' }))).not.toThrow();
    expect(() => requireAdmin(principal({ role: 'superadmin' }))).not.toThrow();
    expect(() => requireAdmin(principal({ role: 'warehouse' }))).toThrowError(AppError);
  });

  it('allows warehouse, admin, and superadmin through requireStaff', () => {
    expect(() => requireStaff(principal({ role: 'warehouse' }))).not.toThrow();
    expect(() => requireStaff(principal({ role: 'admin' }))).not.toThrow();
    expect(() => requireStaff(principal({ role: 'superadmin' }))).not.toThrow();
    expect(() => requireStaff(principal({ role: 'customer' }))).toThrowError(AppError);
  });

  it('rejects an admin from a superadmin-only action', () => {
    expect(() => requireSuperadmin(principal({ role: 'admin' }))).toThrowError(AppError);
    expect(() => requireSuperadmin(principal({ role: 'superadmin' }))).not.toThrow();
  });

  it('enforces fine-grained permissions, superadmin bypasses', () => {
    expect(() => requirePermission(principal({ role: 'admin' }), 'refunds:create')).toThrow();
    expect(() =>
      requirePermission(principal({ role: 'admin', permissions: ['refunds:create'] }), 'refunds:create'),
    ).not.toThrow();
    expect(() => requirePermission(principal({ role: 'superadmin' }), 'refunds:create')).not.toThrow();
  });

  it('prevents IDOR: a user cannot access another users resource', () => {
    const attacker = principal({ uid: 'attacker' });
    expect(() => requireOwnership(attacker, 'victim-uid')).toThrowError(AppError);
    expect(() => requireOwnership(principal({ uid: 'owner' }), 'owner')).not.toThrow();
  });

  it('allows admin override on ownership only when explicitly enabled', () => {
    const admin = principal({ uid: 'admin1', role: 'admin' });
    expect(() => requireOwnership(admin, 'someone-else')).toThrow();
    expect(() => requireOwnership(admin, 'someone-else', { adminOverride: true })).not.toThrow();
  });
});
