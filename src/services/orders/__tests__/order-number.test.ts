import { describe, it, expect } from 'vitest';
import { generateOrderNumber, isValidOrderNumber } from '@/services/orders/order-number';

describe('order number', () => {
  it('has the EVM-XXXXXXXX format', () => {
    const n = generateOrderNumber();
    expect(n).toMatch(/^EVM-[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(isValidOrderNumber(n)).toBe(true);
  });

  it('is non-sequential / unique across generations', () => {
    const set = new Set(Array.from({ length: 200 }, () => generateOrderNumber()));
    expect(set.size).toBeGreaterThan(195); // effectively all unique
  });

  it('rejects sequential-looking or malformed references', () => {
    expect(isValidOrderNumber('EVM-100001')).toBe(false); // contains no lowercase seq but 0/1 ok? check length
    expect(isValidOrderNumber('EVM-123')).toBe(false);
    expect(isValidOrderNumber('evm-ABCDEFGH')).toBe(false);
    expect(isValidOrderNumber('EVM-ABCDEFGI')).toBe(false); // I not in alphabet
    expect(isValidOrderNumber('../../etc')).toBe(false);
  });
});
