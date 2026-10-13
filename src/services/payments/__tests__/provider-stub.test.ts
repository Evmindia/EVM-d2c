import { describe, it, expect } from 'vitest';
import { RazorpayProvider } from '@/services/payments/providers/razorpay';
import { CashfreeProvider } from '@/services/payments/providers/cashfree';
import { AppError, NotImplementedError } from '@/lib/security/errors';

const order = { orderId: 'o1', amount: { value: 100, currency: 'INR' as const }, idempotencyKey: 'k' };

/**
 * Razorpay is implemented (Phase 6). Without configured credentials it fails
 * SAFELY with configuration_pending — it never runs a half-configured gateway.
 * Cashfree remains a PENDING stub. (Env is unset in tests, so creds() throws.)
 */
describe('payment provider guards', () => {
  it('Razorpay createOrder without credentials -> configuration_pending (safe)', async () => {
    await expect(new RazorpayProvider().createOrder(order)).rejects.toMatchObject({
      code: 'configuration_pending',
    });
  });

  it('Razorpay refund is deferred to a later phase (NotImplemented)', async () => {
    await expect(
      new RazorpayProvider().refund({
        paymentId: 'p', providerPaymentId: 'pp', amount: { value: 100, currency: 'INR' }, idempotencyKey: 'k',
      }),
    ).rejects.toBeInstanceOf(NotImplementedError);
  });

  it('Cashfree stub throws NotImplemented (provider PENDING)', async () => {
    await expect(new CashfreeProvider().createOrder(order)).rejects.toBeInstanceOf(
      NotImplementedError,
    );
    expect(AppError).toBeTruthy();
  });
});
