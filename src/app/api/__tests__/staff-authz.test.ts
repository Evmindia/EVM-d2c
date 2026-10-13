import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const verifyIdToken = vi.fn();
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: () => ({ verifyIdToken, verifySessionCookie: vi.fn() }),
  adminDb: () => ({
    collection: () => ({
      doc: () => ({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      }),
      get: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
    }),
  }),
}));

const listStaffMembers = vi.fn(async () => [
  {
    uid: 's1',
    email: 'super@evmzone.com',
    displayName: 'Super User',
    role: 'superadmin',
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    uid: 'w1',
    email: 'dispatch@evmzone.com',
    displayName: 'Bhiwandi Warehouse',
    role: 'warehouse',
    isActive: true,
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
  },
]);

const createStaffMember = vi.fn(async (input, actor) => ({
  uid: 'new-user',
  email: input.email,
  displayName: input.displayName || 'Staff',
  role: input.role,
  isActive: true,
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
  createdBy: actor.uid,
}));

vi.mock('@/services/admin/staff.service', () => ({
  listStaffMembers: (...a: unknown[]) => listStaffMembers(...(a as [])),
  createStaffMember: (...a: unknown[]) => createStaffMember(...(a as [any, any])),
  updateStaffMember: vi.fn(),
  deleteStaffMember: vi.fn(),
  getPermissionsForRole: vi.fn((role: string) => {
    if (role === 'superadmin') return ['roles:manage', 'users:manage'];
    if (role === 'admin') return ['products:write', 'orders:read'];
    return ['orders:read'];
  }),
}));

import { GET as STAFF_GET, POST as STAFF_POST } from '@/app/api/admin/staff/route';

function makeReq(url: string, opts: { method?: string; body?: unknown; auth?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.auth) headers.authorization = `Bearer ${opts.auth}`;
  if (opts.body) headers['content-type'] = 'application/json';
  return new NextRequest(`https://shop.example${url}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

describe('Staff management API authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/admin/staff rejects unauthenticated with 401', async () => {
    const res = await STAFF_GET(makeReq('/api/admin/staff'));
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/staff rejects customer and admin with 403', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'c1', role: 'customer' });
    const custRes = await STAFF_GET(makeReq('/api/admin/staff', { auth: 'tok' }));
    expect(custRes.status).toBe(403);

    verifyIdToken.mockResolvedValueOnce({ uid: 'a1', role: 'admin' });
    const adminRes = await STAFF_GET(makeReq('/api/admin/staff', { auth: 'tok' }));
    expect(adminRes.status).toBe(403);

    verifyIdToken.mockResolvedValueOnce({ uid: 'w1', role: 'warehouse' });
    const warehouseRes = await STAFF_GET(makeReq('/api/admin/staff', { auth: 'tok' }));
    expect(warehouseRes.status).toBe(403);
  });

  it('GET /api/admin/staff allows superadmin with 200', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 's1', role: 'superadmin' });
    const res = await STAFF_GET(makeReq('/api/admin/staff', { auth: 'tok' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.staff).toHaveLength(2);
    expect(body.data.staff[1].role).toBe('warehouse');
  });

  it('POST /api/admin/staff rejects non-superadmin with 403', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'a1', role: 'admin' });
    const res = await STAFF_POST(
      makeReq('/api/admin/staff', {
        method: 'POST',
        auth: 'tok',
        body: {
          email: 'dispatch@evmzone.com',
          password: 'Password123!',
          role: 'warehouse',
        },
      })
    );
    expect(res.status).toBe(403);
  });

  it('POST /api/admin/staff validates email and password length (min 10)', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 's1', role: 'superadmin' });
    const res = await STAFF_POST(
      makeReq('/api/admin/staff', {
        method: 'POST',
        auth: 'tok',
        body: {
          email: 'not-an-email',
          password: 'short',
          role: 'warehouse',
        },
      })
    );
    expect(res.status).toBe(422);
  });

  it('POST /api/admin/staff allows superadmin to create dispatch login', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 's1', role: 'superadmin' });
    const res = await STAFF_POST(
      makeReq('/api/admin/staff', {
        method: 'POST',
        auth: 'tok',
        body: {
          email: 'dispatch.hub@evmzone.com',
          password: 'SecurePassword123!',
          displayName: 'Hub Dispatch Team',
          role: 'warehouse',
        },
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.staff.role).toBe('warehouse');
    expect(body.data.staff.email).toBe('dispatch.hub@evmzone.com');
  });
});
