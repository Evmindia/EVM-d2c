import { describe, it, expect } from 'vitest';
import {
  canOrderTransition,
  assertOrderTransition,
  canPaymentTransition,
  INITIAL_ORDER_STATUS,
  INITIAL_PAYMENT_STATUS,
} from '@/services/orders/order.state-machine';
import { AppError } from '@/lib/security/errors';

describe('order state machine', () => {
  it('starts at PAYMENT_PENDING / PENDING', () => {
    expect(INITIAL_ORDER_STATUS).toBe('PAYMENT_PENDING');
    expect(INITIAL_PAYMENT_STATUS).toBe('PENDING');
  });

  it('PAYMENT_PENDING -> PAID is a valid (future-only) transition', () => {
    // Valid in the machine, but reachable only via a future authorized payment
    // service — no Phase 4 code path invokes it.
    expect(canOrderTransition('PAYMENT_PENDING', 'PAID')).toBe(true);
  });

  it('rejects arbitrary/invalid order transitions', () => {
    expect(canOrderTransition('PAYMENT_PENDING', 'DELIVERED')).toBe(false);
    expect(canOrderTransition('PAYMENT_PENDING', 'SHIPPED')).toBe(false);
    expect(canOrderTransition('DELIVERED', 'PAYMENT_PENDING')).toBe(false);
    expect(canOrderTransition('CANCELLED', 'PAID')).toBe(false);
    expect(() => assertOrderTransition('PAYMENT_PENDING', 'DELIVERED')).toThrowError(AppError);
  });

  it('allows cancellation from PAYMENT_PENDING', () => {
    expect(canOrderTransition('PAYMENT_PENDING', 'CANCELLED')).toBe(true);
  });
});

describe('payment state machine', () => {
  it('permits PENDING -> AUTHORIZED/CAPTURED/FAILED only', () => {
    expect(canPaymentTransition('PENDING', 'CAPTURED')).toBe(true);
    expect(canPaymentTransition('PENDING', 'AUTHORIZED')).toBe(true);
    expect(canPaymentTransition('PENDING', 'FAILED')).toBe(true);
    expect(canPaymentTransition('PENDING', 'REFUNDED')).toBe(false);
  });

  it('rejects going back to PENDING or skipping states', () => {
    expect(canPaymentTransition('CAPTURED', 'PENDING')).toBe(false);
    expect(canPaymentTransition('FAILED', 'CAPTURED')).toBe(false);
  });
});
