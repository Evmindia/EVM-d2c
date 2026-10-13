import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Payment API tests: strict input (no injected amount/currency/status), order
 * reference validation, IDOR routing (service not_found -> 404), webhook status
 * codes. The payment service is mocked; wiring + validation are asserted here.
 */
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: () => ({ verifyIdToken: vi.fn(), verifySessionCookie: vi.fn() }),
  adminDb: () => ({}),
}));

const createPaymentForOrder = vi.fn(async () => ({ provider: 'razorpay', keyId: 'rzp_test_key', providerOrderId: 'order_ABC', amount: 199900, currency: 'INR', orderReference: 'EVM-ABCD1234' }));
const verifyAndCapture = vi.fn(async () => ({ orderReference: 'EVM-ABCD1234', status: 'CAPTURED', amount: 199900, currency: 'INR' }));
const getPaymentStatus = vi.fn(async () => ({ orderReference: 'EVM-ABCD1234', status: 'PENDING', amount: 199900, currency: 'INR' }));
const processWebhook = vi.fn(
  async (): Promise<{ ok: boolean; handled: boolean; reason?: string }> => ({ ok: true, handled: true }),
);
vi.mock('@/services/payments/payment.service', () => ({
  createPaymentForOrder: (...a: unknown[]) => createPaymentForOrder(...(a as [])),
  verifyAndCapture: (...a: unknown[]) => verifyAndCapture(...(a as [])),
  getPaymentStatus: (...a: unknown[]) => getPaymentStatus(...(a as [])),
  retryPayment: vi.fn(async () => ({})),
  processWebhook: (...a: unknown[]) => processWebhook(...(a as [])),
}));

import { POST as CREATE } from '@/app/api/payments/create/route';
import { POST as VERIFY } from '@/app/api/payments/verify/route';
import { GET as STATUS } from '@/app/api/payments/status/route';
import { POST as WEBHOOK } from '@/app/api/webhooks/razorpay/route';

function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`https://shop.example${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  createPaymentForOrder.mockClear();
  verifyAndCapture.mockClear();
  processWebhook.mockClear();
  createPaymentForOrder.mockResolvedValue({ provider: 'razorpay', keyId: 'rzp_test_key', providerOrderId: 'order_ABC', amount: 199900, currency: 'INR', orderReference: 'EVM-ABCD1234' });
});

describe('POST /api/payments/create', () => {
  it('rejects injected amount/currency/status (strict schema, 422)', async () => {
    const res = await CREATE(post('/api/payments/create', { orderReference: 'EVM-ABCD1234', amount: 1, currency: 'USD', paymentStatus: 'CAPTURED' }));
    expect(res.status).toBe(422);
    expect(createPaymentForOrder).not.toHaveBeenCalled();
  });

  it('rejects a malformed order reference (422)', async () => {
    const res = await CREATE(post('/api/payments/create', { orderReference: 'not-an-order' }));
    expect(res.status).toBe(422);
  });

  it('creates for a valid reference and returns only safe fields', async () => {
    const res = await CREATE(post('/api/payments/create', { orderReference: 'EVM-ABCD1234' }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: Record<string, unknown> };
    expect(json.data).not.toHaveProperty('keySecret');
    expect(json.data.keyId).toBe('rzp_test_key');
  });

  it('propagates IDOR as 404 (service not_found)', async () => {
    const { AppError } = await import('@/lib/security/errors');
    createPaymentForOrder.mockRejectedValueOnce(new AppError('not_found'));
    const res = await CREATE(post('/api/payments/create', { orderReference: 'EVM-ABCD1234' }));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/payments/verify', () => {
  it('requires all fields (422 when incomplete)', async () => {
    const res = await VERIFY(post('/api/payments/verify', { orderReference: 'EVM-ABCD1234' }));
    expect(res.status).toBe(422);
  });

  it('returns 400 on a failed signature verification (service bad_request)', async () => {
    const { AppError } = await import('@/lib/security/errors');
    verifyAndCapture.mockRejectedValueOnce(new AppError('bad_request'));
    const res = await VERIFY(post('/api/payments/verify', { orderReference: 'EVM-ABCD1234', providerOrderId: 'order_ABC', providerPaymentId: 'pay_X', signature: 'sig' }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/payments/status', () => {
  it('rejects a malformed order reference (422)', async () => {
    const res = await STATUS(new NextRequest('https://shop.example/api/payments/status?order=bad'));
    expect(res.status).toBe(422);
  });
  it('returns the safe payment DTO for a valid reference', async () => {
    const res = await STATUS(new NextRequest('https://shop.example/api/payments/status?order=EVM-ABCD1234'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/webhooks/razorpay', () => {
  it('returns 400 for a forged webhook (invalid signature)', async () => {
    processWebhook.mockResolvedValueOnce({ ok: false, handled: false, reason: 'invalid_signature' });
    const res = await WEBHOOK(post('/api/webhooks/razorpay', '{"event":"x"}'));
    expect(res.status).toBe(400);
  });
  it('returns 200 for a handled event', async () => {
    processWebhook.mockResolvedValueOnce({ ok: true, handled: true });
    const res = await WEBHOOK(post('/api/webhooks/razorpay', '{"event":"payment.captured"}', { 'x-razorpay-signature': 'sig' }));
    expect(res.status).toBe(200);
  });
  it('returns 200 for a duplicate/ignored event (stops provider retries)', async () => {
    processWebhook.mockResolvedValueOnce({ ok: true, handled: false, reason: 'duplicate' });
    const res = await WEBHOOK(post('/api/webhooks/razorpay', '{"event":"payment.captured"}'));
    expect(res.status).toBe(200);
  });
  it('does not require customer auth (no 401)', async () => {
    processWebhook.mockResolvedValueOnce({ ok: true, handled: true });
    const res = await WEBHOOK(post('/api/webhooks/razorpay', '{}'));
    expect(res.status).not.toBe(401);
  });
});
