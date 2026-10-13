import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CheckoutSummary } from '@/services/checkout/checkout.types';
import type { Order } from '@/services/orders/order.types';

// ---- Controlled checkout summary -------------------------------------------
let SUMMARY: CheckoutSummary;
vi.mock('@/services/checkout/checkout.service', () => ({
  previewCheckout: async () => SUMMARY,
}));
vi.mock('@/lib/audit/audit', () => ({ recordAudit: vi.fn(async () => {}) }));

// ---- In-memory order repository mock ---------------------------------------
const idemStore = new Map<string, { orderId: string; fingerprint: string }>();
const orderById = new Map<string, Order>();
const orderByNumber = new Map<string, Order>();
let seq = 0;

vi.mock('@/services/orders/order.repository', () => ({
  idempotencyDocId: (a: string, b: string) => `${a}::${b}`,
  requestFingerprint: (p: unknown) => JSON.stringify(p),
  getByOrderNumber: async (n: string) => orderByNumber.get(n) ?? null,
  createOrderIdempotent: async (
    data: Omit<Order, 'id'>,
    idem: { docId: string; fingerprint: string },
  ) => {
    const existing = idemStore.get(idem.docId);
    if (existing) {
      if (existing.fingerprint !== idem.fingerprint) {
        const { AppError } = await import('@/lib/security/errors');
        throw new AppError('conflict', { internal: 'idem mismatch' });
      }
      return { order: orderById.get(existing.orderId)!, created: false };
    }
    const id = `ord${++seq}`;
    const order: Order = { ...data, id };
    orderById.set(id, order);
    orderByNumber.set(order.orderNumber, order);
    idemStore.set(idem.docId, { orderId: id, fingerprint: idem.fingerprint });
    return { order, created: true };
  },
}));

import { createOrder, getOrderForCaller } from '@/services/orders/order.service';

const CONFIGURED: CheckoutSummary = {
  items: [
    { productId: 'p1', sku: 'P1', title: 'EVM Earphones', unitPrice: 49900, quantity: 2, lineSubtotal: 99800, available: true },
  ],
  subtotal: 99800,
  discount: 0,
  couponCode: null,
  tax: {
    status: 'CONFIGURED',
    amount: 1800,
    breakdown: { cgst: 900, sgst: 900, igst: 0, rate: 0.18, intraState: true },
    note: '',
  },
  shipping: { status: 'CONFIGURED', amount: 5000, method: 's', note: '' },
  total: 106600,
  currency: 'INR',
  configurationComplete: true,
  hasUnavailable: false,
  issues: [],
};

const PENDING: CheckoutSummary = {
  ...CONFIGURED,
  tax: { status: 'NOT_CONFIGURED', amount: null, breakdown: null, note: '' },
  shipping: { status: 'NOT_CONFIGURED', amount: null, method: null, note: '' },
  total: null,
  configurationComplete: false,
  issues: ['Tax configuration is pending.'],
};

const input = {
  customer: { fullName: 'Asha', email: 'asha@example.com', phone: '9876543210' },
  shippingAddress: {
    fullName: 'Asha', phone: '9876543210', addressLine1: '12 MG Road',
    city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'IN' as const,
  },
  billingAddressSameAsShipping: true,
};

const user = { kind: 'user' as const, uid: 'userA' };
const guest = { kind: 'guest' as const, token: 'g'.repeat(64) };

beforeEach(() => {
  idemStore.clear();
  orderById.clear();
  orderByNumber.clear();
  seq = 0;
  SUMMARY = CONFIGURED;
});

describe('createOrder — configuration guard', () => {
  it('refuses to create an order while tax/shipping config is pending', async () => {
    SUMMARY = PENDING;
    await expect(createOrder(user, input, 'idem-key-123456')).rejects.toMatchObject({
      code: 'configuration_pending',
    });
  });
});

describe('createOrder — snapshot + initial state', () => {
  it('creates a PAYMENT_PENDING / PENDING order snapshot', async () => {
    const res = await createOrder(user, input, 'idem-key-123456');
    expect(res.created).toBe(true);
    expect(res.order.orderStatus).toBe('PAYMENT_PENDING');
    expect(res.order.paymentStatus).toBe('PENDING');
    expect(res.order.orderNumber).toMatch(/^EVM-/);
    expect(res.order.total).toBe(106600);
    expect(res.order.items[0]!.productTitleSnapshot).toBe('EVM Earphones');
    expect(res.order.items[0]!.unitPrice).toBe(49900);
  });

  it('snapshots the server-recalculated GST breakdown onto the order tax', async () => {
    const res = await createOrder(user, input, 'idem-tax-01');
    expect(res.order.tax.amount).toBe(1800);
    expect(res.order.tax.breakdown).toEqual({ cgst: 900, sgst: 900, igst: 0, rate: 0.18, intraState: true });
    // Consistency: cgst + sgst + igst == tax amount.
    const b = res.order.tax.breakdown!;
    expect(b.cgst + b.sgst + b.igst).toBe(res.order.tax.amount);
  });

  it('order tax snapshot is a VALUE copy — later catalog/summary changes cannot alter it', async () => {
    const res = await createOrder(user, input, 'idem-tax-02');
    // Simulate a later change to the source summary (e.g. product gstRate edit).
    CONFIGURED.tax.breakdown!.cgst = 999999;
    CONFIGURED.tax.amount = 555555;
    expect(res.order.tax.breakdown!.cgst).toBe(900); // historical order unchanged
    expect(res.order.tax.amount).toBe(1800);
    CONFIGURED.tax.breakdown!.cgst = 900; // restore for other tests
    CONFIGURED.tax.amount = 1800;
  });

  it('does not return an access token for authenticated users', async () => {
    const res = await createOrder(user, input, 'idem-key-abc123');
    expect(res.accessToken).toBeNull();
  });

  it('returns a one-time access token for guests', async () => {
    const res = await createOrder(guest, input, 'idem-key-guest1');
    expect(res.accessToken).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('createOrder — idempotency', () => {
  it('replaying the same key + payload returns the SAME order (no duplicate)', async () => {
    const first = await createOrder(user, input, 'dup-key-000001');
    const second = await createOrder(user, input, 'dup-key-000001');
    expect(second.created).toBe(false);
    expect(second.order.orderNumber).toBe(first.order.orderNumber);
    expect(orderById.size).toBe(1);
  });

  it('same key with a DIFFERENT payload conflicts', async () => {
    await createOrder(user, input, 'conf-key-000001');
    const other = { ...input, customer: { ...input.customer, fullName: 'Someone Else' } };
    await expect(createOrder(user, other, 'conf-key-000001')).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('different users with the same idempotency key get separate orders', async () => {
    const a = await createOrder({ kind: 'user', uid: 'A' }, input, 'shared-key-01');
    const b = await createOrder({ kind: 'user', uid: 'B' }, input, 'shared-key-01');
    expect(a.order.orderNumber).not.toBe(b.order.orderNumber);
  });
});

describe('getOrderForCaller — access control / IDOR', () => {
  it('lets the owning user read their order', async () => {
    const created = await createOrder(user, input, 'own-key-000001');
    const got = await getOrderForCaller(created.order.orderNumber, { uid: 'userA', capabilityToken: null });
    expect(got.orderNumber).toBe(created.order.orderNumber);
  });

  it('rejects a DIFFERENT user (IDOR) with not_found', async () => {
    const created = await createOrder(user, input, 'own-key-000002');
    await expect(
      getOrderForCaller(created.order.orderNumber, { uid: 'attacker', capabilityToken: null }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('lets a guest read with the correct capability token', async () => {
    const created = await createOrder(guest, input, 'guest-key-01');
    const got = await getOrderForCaller(created.order.orderNumber, {
      uid: null,
      capabilityToken: created.accessToken,
    });
    expect(got.orderNumber).toBe(created.order.orderNumber);
  });

  it('rejects a guest with a wrong/absent capability token (guest IDOR)', async () => {
    const created = await createOrder(guest, input, 'guest-key-02');
    await expect(
      getOrderForCaller(created.order.orderNumber, { uid: null, capabilityToken: 'f'.repeat(64) }),
    ).rejects.toMatchObject({ code: 'not_found' });
    await expect(
      getOrderForCaller(created.order.orderNumber, { uid: null, capabilityToken: null }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('returns not_found for an unknown order reference', async () => {
    await expect(
      getOrderForCaller('EVM-ZZZZZZZZ', { uid: 'userA', capabilityToken: null }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('the public DTO never exposes internal fields', async () => {
    const created = await createOrder(user, input, 'dto-key-000001');
    const got = await getOrderForCaller(created.order.orderNumber, { uid: 'userA', capabilityToken: null });
    const serialized = JSON.stringify(got);
    for (const secret of ['accessTokenHash', 'userId', 'internalNotes', 'cost', 'supplier']) {
      expect(got).not.toHaveProperty(secret);
      expect(serialized).not.toContain(secret);
    }
  });
});
