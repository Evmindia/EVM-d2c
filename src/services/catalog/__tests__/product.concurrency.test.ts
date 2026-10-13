import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from '@/types/catalog';

/**
 * Optimistic-concurrency tests for product updates. A stale update (an
 * expectedUpdatedAt that no longer matches the current document) is rejected
 * with `conflict`, preventing an older admin from clobbering a newer change.
 */
let CURRENT: Partial<Product> & { updatedAt: string };

const setSpy = vi.fn();
vi.mock('@/lib/firebase/admin', () => {
  const ref = {
    get: async () => ({ exists: true, id: 'p1', data: () => CURRENT }),
    set: (...a: unknown[]) => setSpy(...a),
  };
  const db = {
    collection: () => ({ doc: () => ref }),
    runTransaction: async (fn: (tx: { get: (r: unknown) => Promise<unknown>; set: (r: unknown, d: unknown, o?: unknown) => void }) => Promise<unknown>) =>
      fn({
        get: async () => ({ exists: true, id: 'p1', data: () => CURRENT }),
        set: (_r: unknown, d: unknown, o?: unknown) => setSpy(d, o),
      }),
  };
  return { adminDb: () => db };
});

import { updateProduct } from '@/services/catalog/product.service';

beforeEach(() => {
  setSpy.mockClear();
  CURRENT = {
    slug: 'evm-earphones', title: 'EVM Earphones', sku: 'SKU1', brand: 'EVM',
    price: 99900, mrp: 129900, stockStatus: 'in_stock', isActive: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
});

describe('updateProduct optimistic concurrency', () => {
  it('rejects a stale update (expectedUpdatedAt mismatch) with conflict', async () => {
    await expect(
      updateProduct('p1', { price: 109900 }, { expectedUpdatedAt: '2020-01-01T00:00:00.000Z' }),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(setSpy).not.toHaveBeenCalled(); // no write on stale update
  });

  it('applies the update when expectedUpdatedAt matches, computing the price change server-side', async () => {
    const res = await updateProduct(
      'p1',
      { price: 109900 },
      { expectedUpdatedAt: '2026-01-01T00:00:00.000Z' },
    );
    expect(setSpy).toHaveBeenCalled();
    expect(res.priceChange.changed).toBe(true);
    expect(res.priceChange.priceFrom).toBe(99900);
    expect(res.priceChange.priceTo).toBe(109900);
    // Discount % is computed server-side, never trusted from input.
    expect(res.priceChange.discountFrom).toBe(23); // round((129900-99900)/129900*100)=23
    expect(res.priceChange.discountTo).toBe(15); // round((129900-109900)/129900*100)=15
  });

  it('applies without a version when none is supplied (still transactional)', async () => {
    const res = await updateProduct('p1', { title: 'New Title' });
    expect(res.product.title).toBe('New Title');
  });
});
