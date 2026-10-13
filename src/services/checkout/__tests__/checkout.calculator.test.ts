import { describe, it, expect } from 'vitest';
import { calculateSummary } from '@/services/checkout/checkout.calculator';
import type { Product } from '@/types/catalog';
import type { CartItem } from '@/services/cart/cart.types';
import type { TaxQuote } from '@/services/tax/tax.types';
import type { ShippingQuote } from '@/services/shipping/shipping.types';

function product(id: string, o: Partial<Product> = {}): Product {
  return {
    id, slug: id, title: id, shortDescription: '', description: '', brand: 'EVM',
    categoryId: 'c1', sku: id.toUpperCase(), price: 10000, mrp: 20000, currency: 'INR',
    images: [], thumbnail: null, specifications: [], features: [], whatsInTheBox: [],
    warranty: null, stockStatus: 'in_stock', rating: { average: null, count: 0 }, seo: {},
    isActive: true, searchTokens: [], createdAt: '', updatedAt: '', ...o,
  };
}
const NOT_CONFIGURED_TAX: TaxQuote = { status: 'NOT_CONFIGURED', amount: null, breakdown: null, note: '' };
const NOT_CONFIGURED_SHIP: ShippingQuote = { status: 'NOT_CONFIGURED', amount: null, method: null, note: '' };
const CONFIGURED_TAX: TaxQuote = {
  status: 'CONFIGURED',
  amount: 1800,
  breakdown: { cgst: 900, sgst: 900, igst: 0, rate: 0.18, intraState: true },
  note: '',
};
const CONFIGURED_SHIP: ShippingQuote = { status: 'CONFIGURED', amount: 5000, method: 'std', note: '' };

const items: CartItem[] = [{ productId: 'p1', quantity: 2 }];
const products = new Map([['p1', product('p1', { price: 49900 })]]);

describe('checkout calculator — server authority + no fabricated tax/shipping', () => {
  it('computes subtotal from catalog prices', () => {
    const s = calculateSummary({ items, products, discount: { code: null, amount: 0 }, tax: NOT_CONFIGURED_TAX, shipping: NOT_CONFIGURED_SHIP });
    expect(s.subtotal).toBe(99800);
  });

  it('returns NULL total + configurationComplete=false while TAX is pending', () => {
    const s = calculateSummary({ items, products, discount: { code: null, amount: 0 }, tax: NOT_CONFIGURED_TAX, shipping: NOT_CONFIGURED_SHIP });
    expect(s.total).toBeNull();
    expect(s.configurationComplete).toBe(false);
    expect(s.issues).toContain('Tax configuration is pending.');
  });

  it('does NOT treat pending tax/shipping as 0 (no fake 0% GST / free shipping)', () => {
    const s = calculateSummary({ items, products, discount: { code: null, amount: 0 }, tax: NOT_CONFIGURED_TAX, shipping: NOT_CONFIGURED_SHIP });
    expect(s.tax.amount).toBeNull();
    expect(s.shipping.amount).toBeNull();
  });

  it('total = subtotal + GST + shipping when BOTH are configured', () => {
    const s = calculateSummary({ items, products, discount: { code: null, amount: 0 }, tax: CONFIGURED_TAX, shipping: CONFIGURED_SHIP });
    expect(s.configurationComplete).toBe(true);
    expect(s.total).toBe(99800 - 0 + 1800 + 5000);
  });

  it('total = subtotal + GST (shipping omitted) when TAX configured but shipping is NOT (approved formula)', () => {
    const s = calculateSummary({ items, products, discount: { code: null, amount: 0 }, tax: CONFIGURED_TAX, shipping: NOT_CONFIGURED_SHIP });
    expect(s.configurationComplete).toBe(true); // tax is the blocking requirement
    expect(s.total).toBe(99800 + 1800); // shipping contributes 0, never a fake rate
    expect(s.issues).toContain('Shipping is not configured (not added to the total).');
  });

  it('remains configuration-pending when TAX is not configured, even if shipping is', () => {
    const s = calculateSummary({ items, products, discount: { code: null, amount: 0 }, tax: NOT_CONFIGURED_TAX, shipping: CONFIGURED_SHIP });
    expect(s.configurationComplete).toBe(false);
    expect(s.total).toBeNull();
  });

  it('applies a server discount clamped to subtotal', () => {
    const s = calculateSummary({ items, products, discount: { code: 'X', amount: 999999 }, tax: CONFIGURED_TAX, shipping: CONFIGURED_SHIP });
    expect(s.discount).toBe(99800); // clamped
    expect(s.total).toBe(0 + 1800 + 5000);
  });

  it('marks unavailable items and refuses completion', () => {
    const inactive = new Map([['p1', product('p1', { isActive: false })]]);
    const s = calculateSummary({ items, products: inactive, discount: { code: null, amount: 0 }, tax: CONFIGURED_TAX, shipping: CONFIGURED_SHIP });
    expect(s.hasUnavailable).toBe(true);
    expect(s.configurationComplete).toBe(false);
    expect(s.total).toBeNull();
  });

  it('has no channel for a client-supplied total (only catalog + providers)', () => {
    // Re-running with a tampered product price changes subtotal — proving the
    // catalog is the sole source; there is no client-total input at all.
    const tampered = new Map([['p1', product('p1', { price: 1 })]]);
    const s = calculateSummary({ items, products: tampered, discount: { code: null, amount: 0 }, tax: CONFIGURED_TAX, shipping: CONFIGURED_SHIP });
    expect(s.subtotal).toBe(2);
  });
});
