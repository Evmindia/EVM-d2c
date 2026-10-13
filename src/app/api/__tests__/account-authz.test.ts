import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Account API authorization tests: auth required, identity from verified token
 * (never body), privilege-escalation fields rejected, IDOR-safe ids, CSRF.
 */
const verifyIdToken = vi.fn();
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: () => ({ verifyIdToken, verifySessionCookie: vi.fn() }),
  adminDb: () => ({}),
}));

const updateProfile = vi.fn(async () => ({ email: 'a@b.com', displayName: 'A', phone: '9876543210', emailVerified: false, isActive: true, uid: 'userA', createdAt: '', updatedAt: '', lastLoginAt: '' }));
const getProfile = vi.fn(async () => null);
const ensureProfile = vi.fn(async () => ({ email: 'a@b.com', displayName: 'A', phone: '', emailVerified: false, isActive: true, uid: 'userA', createdAt: '', updatedAt: '', lastLoginAt: '' }));
vi.mock('@/services/users/user.service', () => ({
  updateProfile: (...a: unknown[]) => updateProfile(...(a as [])),
  getProfile: (...a: unknown[]) => getProfile(...(a as [])),
  ensureProfile: (...a: unknown[]) => ensureProfile(...(a as [])),
  toPublicProfile: (p: unknown) => p,
}));

const createAddress = vi.fn(async () => ({ id: 'addr1' }));
vi.mock('@/services/addresses/address.service', () => ({
  listAddresses: vi.fn(async () => []),
  createAddress: (...a: unknown[]) => createAddress(...(a as [])),
  updateAddress: vi.fn(async () => ({ id: 'addr1' })),
  deleteAddress: vi.fn(async () => {}),
}));

const listOrdersForUser = vi.fn(async () => []);
vi.mock('@/services/orders/order.service', () => ({
  listOrdersForUser: (...a: unknown[]) => listOrdersForUser(...(a as [])),
}));

import { GET as PROFILE_GET, PATCH as PROFILE_PATCH } from '@/app/api/account/profile/route';
import { POST as ADDRESS_POST } from '@/app/api/account/addresses/route';
import { PATCH as ADDRESS_PATCH } from '@/app/api/account/addresses/[id]/route';
import { GET as ORDERS_GET } from '@/app/api/account/orders/route';

function req(url: string, opts: { method?: string; body?: unknown; auth?: string; origin?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.auth) headers.authorization = `Bearer ${opts.auth}`;
  if (opts.body) headers['content-type'] = 'application/json';
  if (opts.origin) headers.origin = opts.origin;
  return new NextRequest(`https://shop.example${url}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

beforeEach(() => {
  verifyIdToken.mockReset();
  updateProfile.mockClear();
  createAddress.mockClear();
  listOrdersForUser.mockClear();
});

describe('authentication required', () => {
  it('profile GET without auth -> 401', async () => {
    const res = await PROFILE_GET(req('/api/account/profile'));
    expect(res.status).toBe(401);
  });
  it('orders GET without auth -> 401', async () => {
    const res = await ORDERS_GET(req('/api/account/orders'));
    expect(res.status).toBe(401);
  });
});

describe('profile update — privilege escalation blocked', () => {
  it('rejects role/permissions/isActive/emailVerified/uid/email injection (422)', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'userA', role: 'customer' });
    for (const bad of [
      { role: 'admin' },
      { permissions: ['admin'] },
      { isActive: true },
      { emailVerified: true },
      { uid: 'another-user' },
      { email: 'new@evil.com' },
    ]) {
      const res = await PROFILE_PATCH(req('/api/account/profile', { method: 'PATCH', auth: 't', body: bad }));
      expect(res.status).toBe(422);
    }
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('updates allowed fields using the verified uid', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'userA', role: 'customer' });
    const res = await PROFILE_PATCH(req('/api/account/profile', { method: 'PATCH', auth: 't', body: { displayName: 'New Name' } }));
    expect(res.status).toBe(200);
    expect(updateProfile).toHaveBeenCalledWith('userA', { displayName: 'New Name' });
  });
});

describe('address create — uid from token, not body', () => {
  it('rejects a body userId (422)', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'userA', role: 'customer' });
    const res = await ADDRESS_POST(
      req('/api/account/addresses', {
        method: 'POST',
        auth: 't',
        body: { fullName: 'A', phone: '9876543210', addressLine1: 'x', city: 'B', state: 'K', postalCode: '560001', country: 'IN', userId: 'victim' },
      }),
    );
    expect(res.status).toBe(422);
    expect(createAddress).not.toHaveBeenCalled();
  });

  it('creates with the verified uid', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'userA', role: 'customer' });
    const res = await ADDRESS_POST(
      req('/api/account/addresses', {
        method: 'POST',
        auth: 't',
        body: { fullName: 'A', phone: '9876543210', addressLine1: 'x', city: 'B', state: 'K', postalCode: '560001', country: 'IN' },
      }),
    );
    expect(res.status).toBe(201);
    expect((createAddress.mock.calls[0] as unknown[])[0]).toBe('userA');
  });

  it('rejects a malformed address id on PATCH (422)', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'userA', role: 'customer' });
    const res = await ADDRESS_PATCH(
      req('/api/account/addresses/..%2Fsecret', { method: 'PATCH', auth: 't', body: { city: 'X' } }),
    );
    expect(res.status).toBe(422);
  });
});

describe('CSRF same-origin enforcement on mutations', () => {
  it('blocks a cross-origin profile PATCH (403)', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'userA', role: 'customer' });
    const res = await PROFILE_PATCH(
      req('/api/account/profile', { method: 'PATCH', auth: 't', body: { displayName: 'X' }, origin: 'https://evil.example' }),
    );
    expect(res.status).toBe(403);
  });
});
