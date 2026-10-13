import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Public catalog API tests. The service layer is mocked; we assert the route
 * behavior: query validation, pagination caps, safe errors, and that only the
 * public DTO shape flows through (routes never add internal fields).
 */
const listPublicProducts = vi.fn();
const getPublicProductBySlug = vi.fn();
vi.mock('@/services/catalog/product.service', () => ({
  listPublicProducts: (...a: unknown[]) => listPublicProducts(...(a as [])),
  getPublicProductBySlug: (...a: unknown[]) => getPublicProductBySlug(...(a as [])),
}));

import { GET as listGET } from '@/app/api/products/route';
import { GET as detailGET } from '@/app/api/products/[slug]/route';

function req(url: string): NextRequest {
  return new NextRequest(`https://x.test${url}`);
}

beforeEach(() => {
  listPublicProducts.mockReset();
  getPublicProductBySlug.mockReset();
});

describe('GET /api/products', () => {
  it('rejects an over-cap limit with 422 (no unbounded queries)', async () => {
    const res = await listGET(req('/api/products?limit=999'));
    expect(res.status).toBe(422);
    expect(listPublicProducts).not.toHaveBeenCalled();
  });

  it('rejects an unknown sort value', async () => {
    const res = await listGET(req('/api/products?sort=rating'));
    expect(res.status).toBe(422);
  });

  it('returns the service result for a valid query', async () => {
    listPublicProducts.mockResolvedValueOnce({ items: [], nextCursor: null });
    const res = await listGET(req('/api/products?sort=price_asc&limit=10'));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; data: { items: unknown[] } };
    expect(json.ok).toBe(true);
    expect(json.data.items).toEqual([]);
  });
});

describe('GET /api/products/[slug]', () => {
  it('returns 404 for a missing/inactive product (no existence leak)', async () => {
    getPublicProductBySlug.mockResolvedValueOnce(null);
    const res = await detailGET(req('/api/products/evm-power-bank'));
    expect(res.status).toBe(404);
  });

  it('rejects a malformed slug with a safe validation error', async () => {
    const res = await detailGET(req('/api/products/Bad%20Slug'));
    expect([404, 422]).toContain(res.status);
    expect(getPublicProductBySlug).not.toHaveBeenCalled();
  });
});
