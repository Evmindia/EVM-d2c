import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Admin API authorization tests. Firebase Admin is mocked to mint controlled
 * tokens; admin services are mocked so no DB is touched. We assert the real
 * requireAdmin / requirePermission chain, privilege-escalation rejection,
 * IDOR-safe ids, CSRF, and that payment/audit are read-only.
 */
const verifyIdToken = vi.fn();
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: () => ({ verifyIdToken, verifySessionCookie: vi.fn() }),
  adminDb: () => ({}),
}));

const getDashboard = vi.fn(async () => ({ products: {}, orders: {}, recentOrders: [], recentActivity: [], notes: [] }));
const getAdminCustomer = vi.fn(async () => ({ uid: 'u1', email: 'a@b.com' }));
const setCustomerActive = vi.fn(async () => ({ uid: 'u1', isActive: false }));
const listAdminOrders = vi.fn(async () => []);
const getAdminPayment = vi.fn(async () => ({ orderReference: 'EVM-ABCD1234', status: 'PENDING' }));
const advanceAdminOrder = vi.fn(async () => ({ orderNumber: 'EVM-ABCD1234', orderStatus: 'PROCESSING' }));
vi.mock('@/services/admin/admin.service', () => ({
  getDashboard: (...a: unknown[]) => getDashboard(...(a as [])),
  getAdminCustomer: (...a: unknown[]) => getAdminCustomer(...(a as [])),
  setCustomerActive: (...a: unknown[]) => setCustomerActive(...(a as [])),
  listAdminOrders: (...a: unknown[]) => listAdminOrders(...(a as [])),
  searchAdminOrders: vi.fn(async () => []),
  getAdminOrder: vi.fn(async () => ({ orderNumber: 'EVM-ABCD1234' })),
  getAdminPayment: (...a: unknown[]) => getAdminPayment(...(a as [])),
  advanceAdminOrder: (...a: unknown[]) => advanceAdminOrder(...(a as [])),
}));
vi.mock('@/services/admin/admin.audit.service', () => ({ listAuditEvents: vi.fn(async () => []) }));

const updateProduct = vi.fn(async () => ({ product: { id: 'p1', updatedAt: 't2' }, priceChange: { changed: true, priceFrom: 99900, priceTo: 109900, mrpFrom: null, mrpTo: null, discountFrom: null, discountTo: null } }));
const setProductActive = vi.fn(async () => {});
vi.mock('@/services/catalog/product.service', () => ({
  updateProduct: (...a: unknown[]) => updateProduct(...(a as [])),
  setProductActive: (...a: unknown[]) => setProductActive(...(a as [])),
  adminGetProduct: vi.fn(async () => ({ id: 'p1' })),
}));
const recordAudit = vi.fn(async (_entry: { action: string }) => {});
vi.mock('@/lib/audit/audit', () => ({ recordAudit: (...a: unknown[]) => recordAudit(...(a as [{ action: string }])) }));

import { GET as DASH } from '@/app/api/admin/dashboard/route';
import { GET as CUST_GET, POST as CUST_POST } from '@/app/api/admin/customers/[uid]/route';
import { PATCH as PROD_PATCH } from '@/app/api/admin/products/[id]/route';
import { GET as PAY_GET } from '@/app/api/admin/payments/route';
import * as auditRoute from '@/app/api/admin/audit-logs/route';
import * as paymentsRoute from '@/app/api/admin/payments/route';
import * as adminOrderRoute from '@/app/api/admin/orders/[reference]/route';

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
const customer = { uid: 'c1', role: 'customer' };
const adminNoPerm = { uid: 'a1', role: 'admin', permissions: [] as string[] };
const adminWrite = { uid: 'a1', role: 'admin', permissions: ['products:write'] };
const adminUsers = { uid: 'a1', role: 'admin', permissions: ['users:manage'] };
const superadmin = { uid: 's1', role: 'superadmin' };

beforeEach(() => {
  verifyIdToken.mockReset();
  updateProduct.mockClear();
  setCustomerActive.mockClear();
  advanceAdminOrder.mockClear();
  recordAudit.mockClear();
});

describe('admin read routes require admin', () => {
  it('dashboard: 401 unauth, 403 customer, 200 admin', async () => {
    expect((await DASH(req('/api/admin/dashboard'))).status).toBe(401);
    verifyIdToken.mockResolvedValueOnce(customer);
    expect((await DASH(req('/api/admin/dashboard', { auth: 't' }))).status).toBe(403);
    verifyIdToken.mockResolvedValueOnce(adminNoPerm);
    expect((await DASH(req('/api/admin/dashboard', { auth: 't' }))).status).toBe(200);
  });

  it('customer detail: customer denied (403), admin allowed (200)', async () => {
    verifyIdToken.mockResolvedValueOnce(customer);
    expect((await CUST_GET(req('/api/admin/customers/u1', { auth: 't' }))).status).toBe(403);
    verifyIdToken.mockResolvedValueOnce(adminNoPerm);
    expect((await CUST_GET(req('/api/admin/customers/u1', { auth: 't' }))).status).toBe(200);
  });

  it('payments view: customer denied; payments route exports NO write method', async () => {
    verifyIdToken.mockResolvedValueOnce(customer);
    expect((await PAY_GET(req('/api/admin/payments?order=EVM-ABCD1234', { auth: 't' }))).status).toBe(403);
    // View-only: no mutating verbs exist on the payments admin route.
    expect(paymentsRoute).not.toHaveProperty('POST');
    expect(paymentsRoute).not.toHaveProperty('PATCH');
    expect(paymentsRoute).not.toHaveProperty('DELETE');
  });

  it('audit-logs: append-only — route exports NO delete/update method', async () => {
    expect(auditRoute).not.toHaveProperty('DELETE');
    expect(auditRoute).not.toHaveProperty('PATCH');
    expect(auditRoute).not.toHaveProperty('PUT');
    expect(auditRoute).not.toHaveProperty('POST');
  });

  it('admin order PATCH: fulfillment transition is admin + permission gated', async () => {
    const ORDER_PATCH = adminOrderRoute.PATCH;
    const patch = (status: string, auth = true) =>
      ORDER_PATCH(
        req('/api/admin/orders/EVM-ABCD1234', {
          method: 'PATCH',
          ...(auth ? { auth: 't' } : {}),
          body: { status },
        }),
      );

    // 401 unauthenticated
    expect((await patch('PROCESSING', false)).status).toBe(401);
    // 403 customer
    verifyIdToken.mockResolvedValueOnce(customer);
    expect((await patch('PROCESSING')).status).toBe(403);
    // 403 admin lacking orders:update
    verifyIdToken.mockResolvedValueOnce(adminNoPerm);
    expect((await patch('PROCESSING')).status).toBe(403);
    // 200 admin with orders:update
    verifyIdToken.mockResolvedValueOnce({ uid: 'a1', role: 'admin', permissions: ['orders:update'] });
    expect((await patch('PROCESSING')).status).toBe(200);
    expect(advanceAdminOrder).toHaveBeenCalled();
    // CANCELLED needs orders:cancel — orders:update alone is denied
    verifyIdToken.mockResolvedValueOnce({ uid: 'a1', role: 'admin', permissions: ['orders:update'] });
    expect((await patch('CANCELLED')).status).toBe(403);
    // superadmin implicitly holds all permissions → can cancel
    verifyIdToken.mockResolvedValueOnce(superadmin);
    expect((await patch('CANCELLED')).status).toBe(200);
    // Payment/system statuses are not accepted (schema rejects → 422)
    verifyIdToken.mockResolvedValueOnce(superadmin);
    expect((await patch('PAID')).status).toBe(422);
    // Still no POST/PUT verbs on the route.
    expect(adminOrderRoute).not.toHaveProperty('POST');
    expect(adminOrderRoute).not.toHaveProperty('PUT');
  });
});

describe('customer status change — permission + escalation + IDOR-safe id', () => {
  const body = { isActive: false };
  it('401 unauth, 403 customer, 403 admin-without-users:manage, 200 with permission', async () => {
    expect((await CUST_POST(req('/api/admin/customers/u1', { method: 'POST', body }))).status).toBe(401);
    verifyIdToken.mockResolvedValueOnce(customer);
    expect((await CUST_POST(req('/api/admin/customers/u1', { method: 'POST', auth: 't', body }))).status).toBe(403);
    verifyIdToken.mockResolvedValueOnce(adminNoPerm);
    expect((await CUST_POST(req('/api/admin/customers/u1', { method: 'POST', auth: 't', body }))).status).toBe(403);
    verifyIdToken.mockResolvedValueOnce(adminUsers);
    const res = await CUST_POST(req('/api/admin/customers/u1', { method: 'POST', auth: 't', body }));
    expect(res.status).toBe(200);
    expect(setCustomerActive).toHaveBeenCalledWith('u1', false);
    expect(recordAudit).toHaveBeenCalled();
  });

  it('rejects role/permission/isAdmin injection in the body (strict, 422)', async () => {
    verifyIdToken.mockResolvedValue(adminUsers);
    for (const bad of [{ isActive: false, role: 'superadmin' }, { isActive: false, admin: true }, { isActive: false, permissions: ['x'] }]) {
      const res = await CUST_POST(req('/api/admin/customers/u1', { method: 'POST', auth: 't', body: bad }));
      expect(res.status).toBe(422);
    }
    expect(setCustomerActive).not.toHaveBeenCalled();
  });

  it('rejects a malformed target uid (path traversal, 422)', async () => {
    verifyIdToken.mockResolvedValueOnce(adminUsers);
    const res = await CUST_POST(req('/api/admin/customers/..%2Fadmin', { method: 'POST', auth: 't', body }));
    expect(res.status).toBe(422);
  });

  it('blocks a cross-origin status change (CSRF, 403)', async () => {
    verifyIdToken.mockResolvedValueOnce(adminUsers);
    const res = await CUST_POST(req('/api/admin/customers/u1', { method: 'POST', auth: 't', body, origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
  });
});

describe('product price change — permission + audit', () => {
  it('403 for admin without products:write', async () => {
    verifyIdToken.mockResolvedValueOnce(adminNoPerm);
    const res = await PROD_PATCH(req('/api/admin/products/p1', { method: 'PATCH', auth: 't', body: { price: 109900 } }));
    expect(res.status).toBe(403);
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it('allows products:write and records a price_change audit event', async () => {
    verifyIdToken.mockResolvedValueOnce(adminWrite);
    const res = await PROD_PATCH(req('/api/admin/products/p1', { method: 'PATCH', auth: 't', body: { price: 109900 } }));
    expect(res.status).toBe(200);
    expect(updateProduct).toHaveBeenCalled();
    const auditCall = recordAudit.mock.calls[0]![0];
    expect(auditCall.action).toBe('product.price_change');
  });

  it('superadmin implicitly has permission', async () => {
    verifyIdToken.mockResolvedValueOnce(superadmin);
    const res = await PROD_PATCH(req('/api/admin/products/p1', { method: 'PATCH', auth: 't', body: { price: 109900 } }));
    expect(res.status).toBe(200);
  });

  it('rejects injected role/isActive-escalation fields via the strict product schema (422)', async () => {
    verifyIdToken.mockResolvedValueOnce(adminWrite);
    const res = await PROD_PATCH(req('/api/admin/products/p1', { method: 'PATCH', auth: 't', body: { role: 'admin', evil: 1 } }));
    expect(res.status).toBe(422);
    expect(updateProduct).not.toHaveBeenCalled();
  });
});
