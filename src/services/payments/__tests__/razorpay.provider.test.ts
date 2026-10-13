import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';

// Mock server env so the adapter has (test) credentials.
vi.mock('@/lib/config/server-env', () => ({
  serverEnv: () => ({
    RAZORPAY_KEY_ID: 'rzp_test_key',
    RAZORPAY_KEY_SECRET: 'test_secret',
    RAZORPAY_WEBHOOK_SECRET: 'wh_secret',
    PAYMENT_KEY_ID: '',
    PAYMENT_KEY_SECRET: '',
    PAYMENT_WEBHOOK_SECRET: '',
  }),
}));

import { RazorpayProvider } from '@/services/payments/providers/razorpay';

const provider = new RazorpayProvider();

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Razorpay createOrder — authoritative amount, public key only', () => {
  it('sends the server amount and returns provider order + public key', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'order_ABC', amount: 199900, currency: 'INR' }), { status: 200 }),
    );
    const res = await provider.createOrder({
      orderId: 'EVM-ABCD1234',
      amount: { value: 199900, currency: 'INR' },
      idempotencyKey: 'k',
    });
    expect(res.providerOrderId).toBe('order_ABC');
    expect(res.amount.value).toBe(199900);
    expect(res.checkoutPayload.keyId).toBe('rzp_test_key'); // public key only
    // Body sent the authoritative amount.
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.amount).toBe(199900);
  });
});

describe('Razorpay verifyPayment — HMAC signature', () => {
  it('rejects a tampered/invalid signature WITHOUT calling the provider', async () => {
    const fetchMock = vi.spyOn(global, 'fetch');
    const res = await provider.verifyPayment({
      orderId: 'EVM-ABCD1234',
      providerOrderId: 'order_ABC',
      providerPaymentId: 'pay_XYZ',
      signature: 'deadbeef',
    });
    expect(res.verified).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled(); // no fetch when signature invalid
  });

  it('accepts a valid signature and fetches the authoritative payment', async () => {
    const sig = createHmac('sha256', 'test_secret').update('order_ABC|pay_XYZ').digest('hex');
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ id: 'pay_XYZ', order_id: 'order_ABC', amount: 199900, currency: 'INR', status: 'captured' }),
        { status: 200 },
      ),
    );
    const res = await provider.verifyPayment({
      orderId: 'EVM-ABCD1234',
      providerOrderId: 'order_ABC',
      providerPaymentId: 'pay_XYZ',
      signature: sig,
    });
    expect(res.verified).toBe(true);
    expect(res.status).toBe('CAPTURED');
    expect(res.amount).toBe(199900);
    expect(res.currency).toBe('INR');
    expect(res.providerOrderId).toBe('order_ABC');
  });
});

describe('Razorpay verifyWebhook — raw-body HMAC', () => {
  const rawBody = JSON.stringify({
    event: 'payment.captured',
    id: 'evt_123',
    payload: { payment: { entity: { id: 'pay_XYZ', order_id: 'order_ABC', amount: 199900, currency: 'INR', status: 'captured' } } },
  });

  it('accepts a correctly-signed webhook and parses expected fields', async () => {
    const signature = createHmac('sha256', 'wh_secret').update(rawBody).digest('hex');
    const res = await provider.verifyWebhook(rawBody, { 'x-razorpay-signature': signature, 'x-razorpay-event-id': 'evt_123' });
    expect(res.valid).toBe(true);
    expect(res.eventType).toBe('payment.captured');
    expect(res.providerOrderId).toBe('order_ABC');
    expect(res.amount).toBe(199900);
    expect(res.currency).toBe('INR');
    expect(res.eventId).toBe('evt_123');
  });

  it('rejects a forged signature', async () => {
    const res = await provider.verifyWebhook(rawBody, { 'x-razorpay-signature': 'forged' });
    expect(res.valid).toBe(false);
  });

  it('rejects a modified body (signature no longer matches)', async () => {
    const signature = createHmac('sha256', 'wh_secret').update(rawBody).digest('hex');
    const tampered = rawBody.replace('199900', '1');
    const res = await provider.verifyWebhook(tampered, { 'x-razorpay-signature': signature });
    expect(res.valid).toBe(false);
  });
});
