import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Authorization tests for the admin catalog API. Firebase Admin is mocked to
 * mint controlled tokens; the catalog service + audit are mocked so no DB is
 * touched. We assert the real authenticate → requireAdmin → requirePermission
 * chain in the route handlers.
 */
const verifyIdToken = vi.fn();
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: () => ({ verifyIdToken, verifySessionCookie: vi.fn() }),
  adminDb: () => ({}),
}));

const createProduct = vi.fn(async () => ({ id: 'new1', slug: 'x', sku: 'Y' }));
const adminListProducts = vi.fn(async () => []);
vi.mock('@/services/catalog/product.service', () => ({
  createProduct: (...a: unknown[]) => createProduct(...(a as [])),
  adminListProducts: (...a: unknown[]) => adminListProducts(...(a as [])),
}));
vi.mock('@/lib/audit/audit', () => ({ recordAudit: vi.fn(async () => {}) }));

import { GET, POST } from '@/app/api/admin/products/route';

const VALID_BODY = {
  slug: 'evm-wired-earphones',
  title: 'EVM Wired Earphones',
  shortDescription: 'short',
  description: 'desc',
  brand: 'EVM',
  categoryId: 'cat123',
  sku: 'EVM-WE-001',
  price: 49900,
  mrp: 79900,
  currency: 'INR',
  images: [],
  thumbnail: null,
  specifications: [],
  features: [],
  whatsInTheBox: [],
  warranty: null,
  stockStatus: 'in_stock',
  seo: {},
  isActive: true,
};

function post(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://x.test/api/admin/products', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
function get(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://x.test/api/admin/products', { headers });
}

beforeEach(() => {
  verifyIdToken.mockReset();
  createProduct.mockClear();
});

describe('admin catalog authorization', () => {
  it('rejects unauthenticated create with 401', async () => {
    const res = await POST(post(VALID_BODY));
    expect(res.status).toBe(401);
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('rejects a customer token with 403 (not admin)', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1', role: 'customer' });
    const res = await POST(post(VALID_BODY, { authorization: 'Bearer t' }));
    expect(res.status).toBe(403);
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('rejects an admin WITHOUT products:write permission with 403', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'a1', role: 'admin', permissions: [] });
    const res = await POST(post(VALID_BODY, { authorization: 'Bearer t' }));
    expect(res.status).toBe(403);
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('allows an admin WITH products:write to create (201)', async () => {
    verifyIdToken.mockResolvedValueOnce({
      uid: 'a1',
      role: 'admin',
      permissions: ['products:write'],
    });
    const res = await POST(post(VALID_BODY, { authorization: 'Bearer t' }));
    expect(res.status).toBe(201);
    expect(createProduct).toHaveBeenCalledTimes(1);
  });

  it('allows superadmin implicitly (no explicit permission needed)', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 's1', role: 'superadmin' });
    const res = await POST(post(VALID_BODY, { authorization: 'Bearer t' }));
    expect(res.status).toBe(201);
  });

  it('rejects an invalid body from an authorized admin with 422 (no write)', async () => {
    verifyIdToken.mockResolvedValueOnce({
      uid: 'a1',
      role: 'admin',
      permissions: ['products:write'],
    });
    const res = await POST(post({ ...VALID_BODY, price: 90000, mrp: 1 }, { authorization: 'Bearer t' }));
    expect(res.status).toBe(422);
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('rejects listing for a customer (403) and requires auth (401)', async () => {
    const res401 = await GET(get());
    expect(res401.status).toBe(401);
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1', role: 'customer' });
    const res403 = await GET(get({ authorization: 'Bearer t' }));
    expect(res403.status).toBe(403);
  });
});
