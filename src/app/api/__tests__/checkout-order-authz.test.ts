import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Checkout + order API tests: strict input validation (no injected monetary or
 * status fields), mandatory idempotency key, malformed order reference handling.
 * Services are mocked; identity wiring uses the real resolver + mocked Firebase.
 */
const verifyIdToken = vi.fn();
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: () => ({ verifyIdToken, verifySessionCookie: vi.fn() }),
  adminDb: () => ({}),
}));

const previewCheckout = vi.fn(async () => ({ items: [], subtotal: 0, total: null, configurationComplete: false }));
vi.mock('@/services/checkout/checkout.service', () => ({
  previewCheckout: (...a: unknown[]) => previewCheckout(...(a as [])),
}));

const createOrder = vi.fn(async () => ({ order: { orderNumber: 'EVM-ABCD1234' }, accessToken: null, created: true }));
const getOrderForCaller = vi.fn(async () => ({ orderNumber: 'EVM-ABCD1234', orderStatus: 'PAYMENT_PENDING' }));
vi.mock('@/services/orders/order.service', () => ({
  createOrder: (...a: unknown[]) => createOrder(...(a as [])),
  getOrderForCaller: (...a: unknown[]) => getOrderForCaller(...(a as [])),
}));

import { POST as PREVIEW } from '@/app/api/checkout/preview/route';
import { POST as CREATE } from '@/app/api/orders/route';
import { GET as GET_ORDER } from '@/app/api/orders/[orderReference]/route';

const validBody = {
  customer: { fullName: 'Asha', email: 'asha@example.com', phone: '9876543210' },
  shippingAddress: {
    fullName: 'Asha', phone: '9876543210', addressLine1: '12 MG Road',
    city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'IN',
  },
  billingAddressSameAsShipping: true,
};

function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`https://x.test${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
function get(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://x.test${url}`, { headers });
}

beforeEach(() => {
  verifyIdToken.mockReset();
  previewCheckout.mockClear();
  createOrder.mockClear();
  getOrderForCaller.mockClear();
});

describe('POST /api/checkout/preview', () => {
  it('rejects injected monetary fields (422)', async () => {
    const res = await PREVIEW(post('/api/checkout/preview', { ...validBody, total: 1, subtotal: 0, tax: 0 }, { cookie: 'evm_cart=' + 'a'.repeat(64) }));
    expect(res.status).toBe(422);
    expect(previewCheckout).not.toHaveBeenCalled();
  });

  it('rejects injected GST/tax fields (gstRate, cgst, sgst, igst, taxBreakdown) — 422', async () => {
    for (const bad of [
      { gstRate: 0 },
      { cgst: 0 },
      { sgst: 0 },
      { igst: 0 },
      { taxBreakdown: { cgst: 0, sgst: 0, igst: 0 } },
      { tax: { status: 'CONFIGURED', amount: 0 } },
    ]) {
      const res = await PREVIEW(
        post('/api/checkout/preview', { ...validBody, ...bad }, { cookie: 'evm_cart=' + 'a'.repeat(64) }),
      );
      expect(res.status).toBe(422);
    }
    expect(previewCheckout).not.toHaveBeenCalled();
  });

  it('runs preview for valid input with a guest cart', async () => {
    const res = await PREVIEW(post('/api/checkout/preview', validBody, { cookie: 'evm_cart=' + 'a'.repeat(64) }));
    expect(res.status).toBe(200);
    expect(previewCheckout).toHaveBeenCalled();
  });
});

describe('POST /api/orders', () => {
  it('requires an Idempotency-Key header (422 without it)', async () => {
    const res = await CREATE(post('/api/orders', validBody, { cookie: 'evm_cart=' + 'a'.repeat(64) }));
    expect(res.status).toBe(422);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('rejects injected total/discount/userId/GST fields (422) even with a valid key', async () => {
    const res = await CREATE(
      post(
        '/api/orders',
        { ...validBody, total: 1, discount: 999, userId: 'victim', gstRate: 0, cgst: 0, igst: 0, tax: 0 },
        { cookie: 'evm_cart=' + 'a'.repeat(64), 'idempotency-key': 'valid-key-000001' },
      ),
    );
    expect(res.status).toBe(422);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('rejects arbitrary orderStatus / paymentStatus injection (422)', async () => {
    const res = await CREATE(
      post('/api/orders', { ...validBody, orderStatus: 'PAID', paymentStatus: 'CAPTURED' }, {
        cookie: 'evm_cart=' + 'a'.repeat(64),
        'idempotency-key': 'valid-key-000002',
      }),
    );
    expect(res.status).toBe(422);
  });

  it('creates an order for a valid request + key', async () => {
    const res = await CREATE(
      post('/api/orders', validBody, {
        cookie: 'evm_cart=' + 'a'.repeat(64),
        'idempotency-key': 'valid-key-000003',
      }),
    );
    expect(res.status).toBe(201);
    expect(createOrder).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/orders/[orderReference]', () => {
  it('returns 404 for a malformed reference (no service call)', async () => {
    const res = await GET_ORDER(get('/api/orders/not-an-order-ref'));
    expect(res.status).toBe(404);
    expect(getOrderForCaller).not.toHaveBeenCalled();
  });

  it('passes a valid reference to the access-controlled service', async () => {
    const res = await GET_ORDER(get('/api/orders/EVM-ABCD1234'));
    expect(res.status).toBe(200);
    expect(getOrderForCaller).toHaveBeenCalled();
  });
});
