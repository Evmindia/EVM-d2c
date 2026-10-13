import { describe, it, expect } from 'vitest';
import { computeOrderAmount } from '@/services/payments/payment.service';
import { AppError } from '@/lib/security/errors';

describe('payment service — server-authoritative amount', () => {
  it('computes totals from trusted line items (ignores any client total)', () => {
    const amount = computeOrderAmount([
      { unitPrice: 49900, quantity: 2 }, // 998.00
      { unitPrice: 20000, quantity: 1 }, // 200.00
    ]);
    expect(amount).toEqual({ value: 119800, currency: 'INR' });
  });

  it('applies discount, shipping, and tax deterministically', () => {
    const amount = computeOrderAmount([{ unitPrice: 100000, quantity: 1 }], {
      discount: 10000,
      shippingFee: 5000,
      taxRate: 0.18,
    });
    // taxable = 90000; tax = 16200; +shipping 5000 => 111200
    expect(amount.value).toBe(111200);
  });

  it('rejects manipulation: negative price, zero qty, empty cart', () => {
    expect(() => computeOrderAmount([])).toThrowError(AppError);
    expect(() => computeOrderAmount([{ unitPrice: -1, quantity: 1 }])).toThrowError(AppError);
    expect(() => computeOrderAmount([{ unitPrice: 100, quantity: 0 }])).toThrowError(AppError);
  });

  it('rejects a discount that would make the total non-positive', () => {
    expect(() =>
      computeOrderAmount([{ unitPrice: 1000, quantity: 1 }], { discount: 5000 }),
    ).toThrowError(AppError);
  });
});
// The payment state machine now lives in order.state-machine.ts (uppercase
// PENDING/AUTHORIZED/CAPTURED/... ) and is tested there.
