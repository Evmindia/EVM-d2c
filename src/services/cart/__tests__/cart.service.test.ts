import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from '@/types/catalog';
import type { CartItem } from '@/services/cart/cart.types';

/**
 * Cart service tests with an in-memory repository mock and a controlled catalog.
 * Exercises add/update/remove/clear/merge, quantity clamping, distinct-item cap,
 * and product validation (nonexistent / inactive).
 */

// ---- In-memory repository mock ---------------------------------------------
const store = new Map<string, CartItem[]>();

vi.mock('@/services/cart/cart.repository', () => {
  const CART_MAX_DISTINCT_ITEMS = 50;
  return {
    userCartRef: (uid: string) => ({ id: `u_${uid}` }),
    guestCartRef: (token: string) => ({ id: `g_${token}` }),
    readCart: async (ref: { id: string }) => {
      if (!store.has(ref.id)) return null;
      return {
        id: ref.id,
        ownerType: ref.id.startsWith('u_') ? 'user' : 'guest',
        items: store.get(ref.id)!,
        createdAt: 't',
        updatedAt: 't',
      };
    },
    mutateCart: async (
      ref: { id: string },
      meta: { ownerType: string; userId?: string },
      mutate: (items: CartItem[]) => CartItem[],
    ) => {
      const base = store.get(ref.id) ?? [];
      const next = mutate(base);
      if (next.length > CART_MAX_DISTINCT_ITEMS) {
        const { AppError } = await import('@/lib/security/errors');
        throw new AppError('bad_request', { internal: 'distinct cap' });
      }
      store.set(ref.id, next);
      return { id: ref.id, ownerType: meta.ownerType, items: next, createdAt: 't', updatedAt: 't' };
    },
    deleteCart: async (ref: { id: string }) => {
      store.delete(ref.id);
    },
  };
});

// ---- Catalog mock -----------------------------------------------------------
function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    slug: id,
    title: id,
    shortDescription: '',
    description: '',
    brand: 'EVM',
    categoryId: 'c1',
    sku: id.toUpperCase(),
    price: 10000,
    mrp: 20000,
    currency: 'INR',
    images: [],
    thumbnail: null,
    specifications: [],
    features: [],
    whatsInTheBox: [],
    warranty: null,
    stockStatus: 'in_stock',
    rating: { average: null, count: 0 },
    seo: {},
    isActive: true,
    searchTokens: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const CATALOG = new Map<string, Product>([
  ['p1', product('p1', { price: 49900 })],
  ['p2', product('p2', { price: 20000 })],
  ['inactive1', product('inactive1', { isActive: false })],
]);

vi.mock('@/services/catalog/product.service', () => ({
  getProductsByIds: async (ids: string[]) => {
    const m = new Map<string, Product>();
    for (const id of ids) if (CATALOG.has(id)) m.set(id, CATALOG.get(id)!);
    return m;
  },
}));

import {
  addItem,
  updateItem,
  removeItem,
  clearCart,
  getCartView,
  mergeGuestIntoUser,
  type CartIdentity,
} from '@/services/cart/cart.service';
import { AppError } from '@/lib/security/errors';

const guest: CartIdentity = { kind: 'guest', token: 'g'.repeat(64) };
const user: CartIdentity = { kind: 'user', uid: 'user1' };

beforeEach(() => store.clear());

describe('add / update / remove / clear', () => {
  it('adds a product', async () => {
    const view = await addItem(guest, 'p1', 2);
    expect(view.itemCount).toBe(2);
    expect(view.subtotal).toBe(49900 * 2);
    expect(view.distinctCount).toBe(1);
  });

  it('adds the same product twice → quantities merge (no duplicate line)', async () => {
    await addItem(guest, 'p1', 2);
    const view = await addItem(guest, 'p1', 3);
    expect(view.distinctCount).toBe(1);
    expect(view.lines[0]!.quantity).toBe(5);
  });

  it('clamps a merged quantity to the per-item maximum', async () => {
    await addItem(guest, 'p1', 8);
    const view = await addItem(guest, 'p1', 8);
    expect(view.lines[0]!.quantity).toBe(10); // CART_MAX_QTY_PER_ITEM
  });

  it('updates absolute quantity (idempotent)', async () => {
    await addItem(guest, 'p1', 2);
    const view = await updateItem(guest, 'p1', 5);
    expect(view.lines[0]!.quantity).toBe(5);
    const again = await updateItem(guest, 'p1', 5);
    expect(again.lines[0]!.quantity).toBe(5);
  });

  it('rejects updating an item not in the cart', async () => {
    await expect(updateItem(guest, 'p1', 3)).rejects.toBeInstanceOf(AppError);
  });

  it('removes an item and clears the cart', async () => {
    await addItem(guest, 'p1', 1);
    await addItem(guest, 'p2', 1);
    const afterRemove = await removeItem(guest, 'p1');
    expect(afterRemove.distinctCount).toBe(1);
    const afterClear = await clearCart(guest);
    expect(afterClear.lines).toHaveLength(0);
    expect(afterClear.itemCount).toBe(0);
  });

  it('creates distinct lines when adding different variants of the same product', async () => {
    await addItem(guest, 'p1', 1, 'var_white');
    const view = await addItem(guest, 'p1', 2, 'var_black');
    expect(view.distinctCount).toBe(2);
    expect(view.itemCount).toBe(3);

    const whiteLine = view.lines.find((l) => l.variantId === 'var_white');
    const blackLine = view.lines.find((l) => l.variantId === 'var_black');
    expect(whiteLine).toBeDefined();
    expect(whiteLine?.quantity).toBe(1);
    expect(blackLine).toBeDefined();
    expect(blackLine?.quantity).toBe(2);
  });

  it('merges quantities when adding the exact same product and variant', async () => {
    await addItem(guest, 'p1', 1, 'var_white');
    const view = await addItem(guest, 'p1', 2, 'var_white');
    expect(view.distinctCount).toBe(1);
    expect(view.itemCount).toBe(3);
    expect(view.lines[0]?.quantity).toBe(3);
  });

  it('updates only the targeted variant line', async () => {
    await addItem(guest, 'p1', 1, 'var_white');
    await addItem(guest, 'p1', 2, 'var_black');

    const view = await updateItem(guest, 'p1', 5, 'var_white');
    const whiteLine = view.lines.find((l) => l.variantId === 'var_white');
    const blackLine = view.lines.find((l) => l.variantId === 'var_black');
    expect(whiteLine?.quantity).toBe(5);
    expect(blackLine?.quantity).toBe(2);
  });

  it('removes only the targeted variant line', async () => {
    await addItem(guest, 'p1', 1, 'var_white');
    await addItem(guest, 'p1', 2, 'var_black');

    const view = await removeItem(guest, 'p1', 'var_white');
    expect(view.distinctCount).toBe(1);
    expect(view.lines[0]?.variantId).toBe('var_black');
    expect(view.lines[0]?.quantity).toBe(2);
  });
});

describe('product validation on add', () => {
  it('rejects a nonexistent product', async () => {
    await expect(addItem(guest, 'ghost', 1)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('rejects an inactive product (inactive injection guard)', async () => {
    await expect(addItem(guest, 'inactive1', 1)).rejects.toMatchObject({ code: 'bad_request' });
  });
});

describe('empty cart', () => {
  it('returns an empty view when no cart exists', async () => {
    const view = await getCartView(user);
    expect(view.lines).toHaveLength(0);
    expect(view.subtotal).toBe(0);
  });
});

describe('guest → user merge', () => {
  it('sums quantities deterministically (A×2 guest + A×1 user = A×3)', async () => {
    await addItem(user, 'p1', 1);
    await addItem(guest, 'p1', 2);
    const view = await mergeGuestIntoUser('user1', 'g'.repeat(64));
    expect(view.lines).toHaveLength(1);
    expect(view.lines[0]!.quantity).toBe(3);
  });

  it('clamps merged quantity to the maximum (never invalid)', async () => {
    await addItem(user, 'p1', 7);
    await addItem(guest, 'p1', 7);
    const view = await mergeGuestIntoUser('user1', 'g'.repeat(64));
    expect(view.lines[0]!.quantity).toBe(10);
  });

  it('combines distinct products from both carts', async () => {
    await addItem(user, 'p1', 1);
    await addItem(guest, 'p2', 1);
    const view = await mergeGuestIntoUser('user1', 'g'.repeat(64));
    expect(view.distinctCount).toBe(2);
  });

  it('deletes the guest cart after merge', async () => {
    await addItem(user, 'p1', 1);
    await addItem(guest, 'p2', 1);
    await mergeGuestIntoUser('user1', 'g'.repeat(64));
    const guestView = await getCartView(guest);
    expect(guestView.lines).toHaveLength(0);
  });
});

describe('concurrent updates keep the cart valid', () => {
  it('concurrent adds of distinct products all persist', async () => {
    await Promise.all([addItem(user, 'p1', 1), addItem(user, 'p2', 2)]);
    const view = await getCartView(user);
    expect(view.distinctCount).toBe(2);
    const p1 = view.lines.find((l) => l.productId === 'p1')!;
    const p2 = view.lines.find((l) => l.productId === 'p2')!;
    expect(p1.quantity).toBe(1);
    expect(p2.quantity).toBe(2);
  });

  it('concurrent adds of the same product accumulate atomically', async () => {
    await Promise.all([addItem(user, 'p1', 2), addItem(user, 'p1', 3)]);
    const view = await getCartView(user);
    expect(view.distinctCount).toBe(1);
    expect(view.lines[0]!.quantity).toBe(5);
  });
});
