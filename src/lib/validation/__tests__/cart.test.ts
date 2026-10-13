import { describe, it, expect } from 'vitest';
import { addItemSchema, updateItemSchema } from '@/lib/validation/cart';
import { CART_MAX_QTY_PER_ITEM } from '@/services/cart/cart.types';

describe('cart input validation', () => {
  it('accepts a valid add-item body', () => {
    const r = addItemSchema.safeParse({ productId: 'prod_123', quantity: 2 });
    expect(r.success).toBe(true);
  });

  it('defaults quantity to 1 when omitted', () => {
    const r = addItemSchema.parse({ productId: 'prod_123' });
    expect(r.quantity).toBe(1);
  });

  it('rejects negative and zero quantities', () => {
    expect(addItemSchema.safeParse({ productId: 'p1', quantity: 0 }).success).toBe(false);
    expect(addItemSchema.safeParse({ productId: 'p1', quantity: -5 }).success).toBe(false);
  });

  it('rejects quantities above the per-item maximum', () => {
    expect(
      addItemSchema.safeParse({ productId: 'p1', quantity: CART_MAX_QTY_PER_ITEM + 1 }).success,
    ).toBe(false);
    expect(addItemSchema.safeParse({ productId: 'p1', quantity: 999999 }).success).toBe(false);
  });

  it('rejects non-integer quantities', () => {
    expect(addItemSchema.safeParse({ productId: 'p1', quantity: 1.5 }).success).toBe(false);
  });

  it('rejects malformed product ids (path traversal / slashes)', () => {
    expect(addItemSchema.safeParse({ productId: '../secret', quantity: 1 }).success).toBe(false);
    expect(addItemSchema.safeParse({ productId: 'a/b', quantity: 1 }).success).toBe(false);
  });

  it('rejects price / subtotal / total injected into the body (strict schema)', () => {
    expect(
      addItemSchema.safeParse({ productId: 'p1', quantity: 1, price: 1, subtotal: 0 }).success,
    ).toBe(false);
    expect(
      updateItemSchema.safeParse({ quantity: 1, total: 999, unitPrice: 1 }).success,
    ).toBe(false);
  });

  it('update requires a valid quantity', () => {
    expect(updateItemSchema.safeParse({}).success).toBe(false);
    expect(updateItemSchema.safeParse({ quantity: 3 }).success).toBe(true);
  });

  it('accepts optional variantId in add and update schemas', () => {
    const addWithVariant = addItemSchema.safeParse({
      productId: 'prod_123',
      quantity: 1,
      variantId: 'var_white',
    });
    expect(addWithVariant.success).toBe(true);

    const updateWithVariant = updateItemSchema.safeParse({
      quantity: 2,
      variantId: 'var_white',
    });
    expect(updateWithVariant.success).toBe(true);
  });
});
