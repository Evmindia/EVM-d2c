import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Order } from '@/services/orders/order.types';
import type { PaymentStatus } from '@/services/payments/payment.types';

/**
 * Payment orchestration tests. Order access, provider, and persistence are
 * mocked. Focus: server-authoritative amount, ownership/IDOR, signature +
 * amount/currency cross-checks, idempotency, webhook handling, state guards.
 */

// ---- Mutable order under test ----------------------------------------------
let ORDER: Order;
function freshOrder(): Order {
  const addr = { fullName: 'A', phone: '9', addressLine1: 'x', city: 'B', state: 'K', postalCode: '560001', country: 'IN' };
  return {
    id: 'ord1', orderNumber: 'EVM-ABCD1234', ownerType: 'user', userId: 'owner', accessTokenHash: null,
    customerName: 'A', customerEmail: 'a@b.com', customerPhone: '9', shippingAddress: addr, billingAddress: addr,
    items: [{ productId: 'p1', sku: 'P1', productTitleSnapshot: 'P1', quantity: 1, unitPrice: 199900, lineSubtotal: 199900 }],
    subtotal: 199900, discount: 0, couponCode: null,
    tax: { status: 'CONFIGURED', amount: 0 }, shipping: { status: 'CONFIGURED', amount: 0 },
    total: 199900, currency: 'INR',
    payment: { status: 'PENDING', provider: null, providerOrderId: null, providerPaymentId: null },
    orderStatus: 'PAYMENT_PENDING', shipmentStatus: 'NOT_CREATED', createdAt: 't', updatedAt: 't',
  };
}

// ---- Order service/repository mocks ----------------------------------------
vi.mock('@/services/orders/order.service', () => ({
  getOrderEntityForCaller: async (ref: string, caller: { uid: string | null; capabilityToken: string | null }) => {
    if (caller.uid !== 'owner' && caller.capabilityToken !== 'validcap') {
      const { AppError } = await import('@/lib/security/errors');
      throw new AppError('not_found');
    }
    return ORDER;
  },
}));
vi.mock('@/services/orders/order.repository', () => ({
  getOrderById: async () => ORDER,
  patchOrder: async (_id: string, patch: Partial<Order>) => {
    ORDER = { ...ORDER, ...patch };
  },
}));

// ---- Payment repository mock (in-memory) -----------------------------------
type Rec = import('@/services/payments/payment.types').PaymentRecord;
const payments = new Map<string, Rec>();
const claimed = new Set<string>();
vi.mock('@/services/payments/payment.repository', () => ({
  getPaymentByOrderId: async (orderId: string) => payments.get(orderId) ?? null,
  getPaymentByProviderOrderId: async (poid: string) =>
    [...payments.values()].find((p) => p.providerOrderId === poid) ?? null,
  upsertPayment: async (rec: Omit<Rec, 'paymentId'>) => {
    const full = { ...rec, paymentId: `pay_${rec.orderId}` } as Rec;
    payments.set(rec.orderId, full);
    return full;
  },
  patchPayment: async (orderId: string, patch: Partial<Rec>) => {
    const cur = payments.get(orderId);
    if (cur) payments.set(orderId, { ...cur, ...patch });
  },
  // Mirrors the real transactional capture: atomic + idempotent + self-reconciling.
  captureAtomically: async (input: { orderId: string; providerPaymentId: string; provider: string; providerOrderId: string | null }) => {
    const { AppError } = await import('@/lib/security/errors');
    const cur = payments.get(input.orderId);
    if (ORDER.orderStatus === 'PAID') {
      if (cur && cur.status !== 'CAPTURED') payments.set(input.orderId, { ...cur, status: 'CAPTURED' });
      return { firstCapture: false };
    }
    if (ORDER.orderStatus !== 'PAYMENT_PENDING') throw new AppError('conflict', { internal: 'order->PAID illegal' });
    if (cur && cur.status === 'FAILED') throw new AppError('conflict', { internal: 'FAILED->CAPTURED illegal' });
    ORDER = { ...ORDER, orderStatus: 'PAID', payment: { status: 'CAPTURED', provider: input.provider as Rec['provider'], providerOrderId: input.providerOrderId, providerPaymentId: input.providerPaymentId } };
    if (cur) payments.set(input.orderId, { ...cur, status: 'CAPTURED', providerPaymentId: input.providerPaymentId, capturedAt: 't' });
    return { firstCapture: true };
  },
  claimWebhookEvent: async (eventId: string) => {
    if (claimed.has(eventId)) return false;
    claimed.add(eventId);
    return true;
  },
}));
vi.mock('@/lib/audit/audit', () => ({ recordAudit: vi.fn(async () => {}) }));
import { recordAudit } from '@/lib/audit/audit';
import type { Mock } from 'vitest';
function capturedAuditCount(): number {
  return (recordAudit as Mock).mock.calls.filter(
    (c) => (c[0] as { metadata?: { event?: string } })?.metadata?.event === 'payment_captured',
  ).length;
}

// ---- Provider mock ----------------------------------------------------------
const providerBehavior: {
  createAmount: number;
  verify: { verified: boolean; providerPaymentId: string; status: PaymentStatus; amount: number | null; currency: string | null; providerOrderId: string | null };
  webhook: { valid: boolean; eventId: string; eventType: string; providerOrderId: string | undefined; providerPaymentId: string; amount: number | null; currency: string | null; status: PaymentStatus };
} = {
  createAmount: 199900,
  verify: { verified: true, providerPaymentId: 'pay_X', status: 'CAPTURED', amount: 199900, currency: 'INR', providerOrderId: 'order_ABC' },
  webhook: { valid: true, eventId: 'evt1', eventType: 'payment.captured', providerOrderId: 'order_ABC', providerPaymentId: 'pay_X', amount: 199900, currency: 'INR', status: 'CAPTURED' },
};
vi.mock('@/services/payments/provider.factory', () => ({
  getPaymentProvider: async () => ({
    id: 'razorpay',
    publicKey: () => 'rzp_test_key',
    createOrder: async (input: { amount: { value: number; currency: string } }) => ({
      provider: 'razorpay',
      providerOrderId: 'order_ABC',
      amount: { value: providerBehavior.createAmount, currency: input.amount.currency },
      checkoutPayload: { keyId: 'rzp_test_key' },
    }),
    verifyPayment: async () => providerBehavior.verify,
    verifyWebhook: async () => providerBehavior.webhook,
    fetchPayment: async () => ({ providerPaymentId: 'pay_X', providerOrderId: 'order_ABC', amount: 199900, currency: 'INR', status: 'CAPTURED' }),
    refund: async () => { throw new Error('nope'); },
  }),
}));

import {
  createPaymentForOrder,
  verifyAndCapture,
  processWebhook,
  getPaymentStatus,
} from '@/services/payments/payment.service';

const owner = { uid: 'owner', capabilityToken: null };
const attacker = { uid: 'attacker', capabilityToken: null };

beforeEach(() => {
  ORDER = freshOrder();
  payments.clear();
  claimed.clear();
  (recordAudit as Mock).mockClear();
  providerBehavior.createAmount = 199900;
  providerBehavior.verify = { verified: true, providerPaymentId: 'pay_X', status: 'CAPTURED', amount: 199900, currency: 'INR', providerOrderId: 'order_ABC' };
  providerBehavior.webhook = { valid: true, eventId: 'evt1', eventType: 'payment.captured', providerOrderId: 'order_ABC', providerPaymentId: 'pay_X', amount: 199900, currency: 'INR', status: 'CAPTURED' };
});

describe('createPaymentForOrder — amount authority + ownership', () => {
  it('uses the server order total, returning only the public key', async () => {
    const init = await createPaymentForOrder(owner, 'EVM-ABCD1234');
    expect(init.amount).toBe(199900); // server total, not client
    expect(init.keyId).toBe('rzp_test_key');
    expect(init.providerOrderId).toBe('order_ABC');
    expect(payments.get('ord1')!.amount).toBe(199900);
  });

  it('rejects IDOR — another user cannot pay this order', async () => {
    await expect(createPaymentForOrder(attacker, 'EVM-ABCD1234')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('fails safely if the provider order amount != server total', async () => {
    providerBehavior.createAmount = 1; // provider disagrees
    await expect(createPaymentForOrder(owner, 'EVM-ABCD1234')).rejects.toMatchObject({ code: 'internal_error' });
  });

  it('rejects an already-paid order', async () => {
    ORDER.orderStatus = 'PAID';
    ORDER.payment.status = 'CAPTURED';
    await expect(createPaymentForOrder(owner, 'EVM-ABCD1234')).rejects.toMatchObject({ code: 'conflict' });
  });

  it('rejects a cancelled order', async () => {
    ORDER.orderStatus = 'CANCELLED';
    await expect(createPaymentForOrder(owner, 'EVM-ABCD1234')).rejects.toMatchObject({ code: 'conflict' });
  });
});

describe('verifyAndCapture — signature + cross-checks + capture', () => {
  async function init() {
    await createPaymentForOrder(owner, 'EVM-ABCD1234');
  }
  const goodInput = { orderReference: 'EVM-ABCD1234', providerOrderId: 'order_ABC', providerPaymentId: 'pay_X', signature: 'sig' };

  it('captures on valid signature + matching amount/currency → order PAID', async () => {
    await init();
    const res = await verifyAndCapture(owner, goodInput);
    expect(res.status).toBe('CAPTURED');
    expect(ORDER.orderStatus).toBe('PAID');
    expect(payments.get('ord1')!.status).toBe('CAPTURED');
  });

  it('rejects a fake/invalid signature → FAILED, order NOT paid', async () => {
    await init();
    providerBehavior.verify = { ...providerBehavior.verify, verified: false, status: 'FAILED' };
    await expect(verifyAndCapture(owner, goodInput)).rejects.toMatchObject({ code: 'bad_request' });
    expect(ORDER.orderStatus).toBe('PAYMENT_PENDING');
    expect(payments.get('ord1')!.status).toBe('FAILED');
  });

  it('rejects a provider order id mismatch', async () => {
    await init();
    await expect(
      verifyAndCapture(owner, { ...goodInput, providerOrderId: 'order_OTHER' }),
    ).rejects.toMatchObject({ code: 'bad_request' });
    expect(ORDER.orderStatus).toBe('PAYMENT_PENDING');
  });

  it('rejects an amount mismatch (provider amount != order total)', async () => {
    await init();
    providerBehavior.verify = { ...providerBehavior.verify, amount: 1 };
    await expect(verifyAndCapture(owner, goodInput)).rejects.toMatchObject({ code: 'bad_request' });
    expect(ORDER.orderStatus).toBe('PAYMENT_PENDING');
  });

  it('rejects a currency mismatch', async () => {
    await init();
    providerBehavior.verify = { ...providerBehavior.verify, currency: 'USD' };
    await expect(verifyAndCapture(owner, goodInput)).rejects.toMatchObject({ code: 'bad_request' });
  });

  it('is idempotent — verifying twice keeps a single capture, order PAID', async () => {
    await init();
    await verifyAndCapture(owner, goodInput);
    const res2 = await verifyAndCapture(owner, goodInput);
    expect(res2.status).toBe('CAPTURED');
    expect(ORDER.orderStatus).toBe('PAID');
  });

  it('rejects IDOR on verify', async () => {
    await init();
    await expect(verifyAndCapture(attacker, goodInput)).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('processWebhook — signature, allowlist, idempotency, cross-checks', () => {
  async function init() {
    await createPaymentForOrder(owner, 'EVM-ABCD1234');
  }
  const raw = '{"event":"payment.captured"}';

  it('rejects a forged webhook (invalid signature)', async () => {
    await init();
    providerBehavior.webhook = { ...providerBehavior.webhook, valid: false };
    const res = await processWebhook(raw, {});
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('invalid_signature');
    expect(ORDER.orderStatus).toBe('PAYMENT_PENDING');
  });

  it('ignores unsupported events safely', async () => {
    await init();
    providerBehavior.webhook = { ...providerBehavior.webhook, eventType: 'refund.processed' };
    const res = await processWebhook(raw, {});
    expect(res.handled).toBe(false);
    expect(res.reason).toBe('ignored_event');
    expect(ORDER.orderStatus).toBe('PAYMENT_PENDING');
  });

  it('captures on a valid captured event → order PAID', async () => {
    await init();
    const res = await processWebhook(raw, {});
    expect(res.handled).toBe(true);
    expect(ORDER.orderStatus).toBe('PAID');
  });

  it('is idempotent — a replayed event is a no-op', async () => {
    await init();
    await processWebhook(raw, {}); // first
    const res2 = await processWebhook(raw, {}); // duplicate (same eventId)
    expect(res2.handled).toBe(false);
    expect(res2.reason).toBe('duplicate');
    expect(ORDER.orderStatus).toBe('PAID');
  });

  it('rejects a webhook with a wrong amount', async () => {
    await init();
    providerBehavior.webhook = { ...providerBehavior.webhook, amount: 1 };
    await expect(processWebhook(raw, {})).rejects.toMatchObject({ code: 'bad_request' });
    expect(ORDER.orderStatus).toBe('PAYMENT_PENDING');
  });

  it('cannot pay a cancelled order via webhook', async () => {
    await init();
    ORDER.orderStatus = 'CANCELLED';
    await expect(processWebhook(raw, {})).rejects.toMatchObject({ code: 'conflict' });
  });
});

describe('getPaymentStatus — safe DTO', () => {
  it('returns only allow-listed fields', async () => {
    await createPaymentForOrder(owner, 'EVM-ABCD1234');
    const dto = await getPaymentStatus(owner, 'EVM-ABCD1234');
    expect(Object.keys(dto).sort()).toEqual(['amount', 'currency', 'orderReference', 'status']);
  });
});

// ============================================================================
// Hardening review: authorized vs captured, failed, transitions, consistency,
// inventory hook, replay.
// ============================================================================
describe('authorized vs captured — order must only be PAID on capture', () => {
  const raw = '{"event":"x"}';
  async function init() {
    await createPaymentForOrder(owner, 'EVM-ABCD1234');
  }

  it('AUTHORIZED webhook -> payment AUTHORIZED, order stays PAYMENT_PENDING (NOT paid)', async () => {
    await init();
    providerBehavior.webhook = { ...providerBehavior.webhook, eventType: 'payment.authorized', status: 'AUTHORIZED' };
    await processWebhook(raw, {});
    expect(payments.get('ord1')!.status).toBe('AUTHORIZED');
    expect(ORDER.orderStatus).toBe('PAYMENT_PENDING');
    expect(capturedAuditCount()).toBe(0); // hook/audit did NOT fire
  });

  it('CAPTURED webhook -> payment CAPTURED AND order PAID (consistent)', async () => {
    await init();
    await processWebhook(raw, {});
    expect(payments.get('ord1')!.status).toBe('CAPTURED');
    expect(ORDER.orderStatus).toBe('PAID');
    expect(ORDER.payment.status).toBe('CAPTURED');
  });

  it('FAILED webhook -> payment FAILED, order stays PAYMENT_PENDING (retryable)', async () => {
    await init();
    providerBehavior.webhook = { ...providerBehavior.webhook, eventType: 'payment.failed', status: 'FAILED' };
    await processWebhook(raw, {});
    expect(payments.get('ord1')!.status).toBe('FAILED');
    expect(ORDER.orderStatus).toBe('PAYMENT_PENDING');
    expect(capturedAuditCount()).toBe(0);
  });

  it('AUTHORIZED then CAPTURED -> order becomes PAID on capture', async () => {
    await init();
    providerBehavior.webhook = { ...providerBehavior.webhook, eventId: 'evt_auth', eventType: 'payment.authorized', status: 'AUTHORIZED' };
    await processWebhook(raw, {});
    expect(ORDER.orderStatus).toBe('PAYMENT_PENDING');
    providerBehavior.webhook = { ...providerBehavior.webhook, eventId: 'evt_cap', eventType: 'payment.captured', status: 'CAPTURED' };
    await processWebhook(raw, {});
    expect(ORDER.orderStatus).toBe('PAID');
    expect(capturedAuditCount()).toBe(1);
  });

  it('FAILED then CAPTURED is rejected by the state machine (no PAID)', async () => {
    await init();
    providerBehavior.webhook = { ...providerBehavior.webhook, eventId: 'evt_fail', eventType: 'payment.failed', status: 'FAILED' };
    await processWebhook(raw, {});
    expect(payments.get('ord1')!.status).toBe('FAILED');
    providerBehavior.webhook = { ...providerBehavior.webhook, eventId: 'evt_cap2', eventType: 'payment.captured', status: 'CAPTURED' };
    await expect(processWebhook(raw, {})).rejects.toMatchObject({ code: 'conflict' });
    expect(ORDER.orderStatus).toBe('PAYMENT_PENDING'); // never PAID
  });
});

describe('replay & idempotency — event id AND state', () => {
  const raw = '{"event":"x"}';
  it('duplicate CAPTURED via a DIFFERENT event id does not re-capture or re-fire the hook', async () => {
    await createPaymentForOrder(owner, 'EVM-ABCD1234');
    providerBehavior.webhook = { ...providerBehavior.webhook, eventId: 'evt_a' };
    await processWebhook(raw, {});
    expect(ORDER.orderStatus).toBe('PAID');
    expect(capturedAuditCount()).toBe(1);
    // Same payment, brand-new event id -> passes the event-id dedupe, but the
    // payment/order STATE is already captured/paid -> no duplicate effect.
    providerBehavior.webhook = { ...providerBehavior.webhook, eventId: 'evt_b' };
    await processWebhook(raw, {});
    expect(ORDER.orderStatus).toBe('PAID');
    expect(capturedAuditCount()).toBe(1); // hook fired exactly once
  });

  it('same event id twice is a no-op (event-id dedupe)', async () => {
    await createPaymentForOrder(owner, 'EVM-ABCD1234');
    providerBehavior.webhook = { ...providerBehavior.webhook, eventId: 'evt_same' };
    await processWebhook(raw, {});
    const res2 = await processWebhook(raw, {});
    expect(res2.reason).toBe('duplicate');
    expect(capturedAuditCount()).toBe(1);
  });
});

describe('error classification (independent of infra) ', () => {
  it('unknown/unauthorized order -> not_found (404), never 500', async () => {
    // Attacker/unknown caller: getOrderEntityForCaller throws not_found.
    await expect(
      verifyAndCapture(attacker, { orderReference: 'EVM-ABCD1234', providerOrderId: 'order_ABC', providerPaymentId: 'pay_X', signature: 'sig' }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('order exists but NO payment initiated -> bad_request (400)', async () => {
    // Owner, but createPaymentForOrder was never called -> no payment record.
    await expect(
      verifyAndCapture(owner, { orderReference: 'EVM-ABCD1234', providerOrderId: 'order_ABC', providerPaymentId: 'pay_X', signature: 'sig' }),
    ).rejects.toMatchObject({ code: 'bad_request' });
  });
});
