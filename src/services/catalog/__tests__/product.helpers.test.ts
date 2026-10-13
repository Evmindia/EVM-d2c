import { describe, it, expect } from 'vitest';
import { discountPercent } from '@/services/catalog/product.service';

describe('discountPercent — never fabricates a discount', () => {
  it('returns null when price or mrp is missing', () => {
    expect(discountPercent(null, 1000)).toBeNull();
    expect(discountPercent(1000, null)).toBeNull();
    expect(discountPercent(null, null)).toBeNull();
  });

  it('returns null when price >= mrp (no fake discount)', () => {
    expect(discountPercent(1000, 1000)).toBeNull();
    expect(discountPercent(1200, 1000)).toBeNull();
  });

  it('computes a rounded percentage for a real discount', () => {
    expect(discountPercent(50000, 100000)).toBe(50);
    expect(discountPercent(79900, 99900)).toBe(20);
  });
});
