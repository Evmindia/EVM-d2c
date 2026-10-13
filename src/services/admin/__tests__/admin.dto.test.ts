import { describe, it, expect } from 'vitest';
import { toAdminOrder, toAdminPayment, toAdminCustomer } from '@/services/admin/admin.dto';
import type { Order } from '@/services/orders/order.types';
import type { PaymentRecord } from '@/services/payments/payment.types';
import type { UserProfile } from '@/services/users/user.types';

const addr = { fullName: 'A', phone: '9', addressLine1: 'x', city: 'B', state: 'K', postalCode: '560001', country: 'IN' };

function order(): Order {
  return {
    id: 'internal-doc-xyz', orderNumber: 'EVM-ABCD1234', ownerType: 'user', userId: 'userA',
    accessTokenHash: 'deadbeef'.repeat(8), customerName: 'A', customerEmail: 'a@b.com', customerPhone: '9',
    shippingAddress: addr, billingAddress: addr,
    items: [{ productId: 'p1', sku: 'P1', productTitleSnapshot: 'EVM Earphones', quantity: 2, unitPrice: 49900, lineSubtotal: 99800 }],
    subtotal: 99800, discount: 0, couponCode: null,
    tax: { status: 'CONFIGURED', amount: 1800 }, shipping: { status: 'CONFIGURED', amount: 5000 },
    total: 106600, currency: 'INR',
    payment: { status: 'CAPTURED', provider: 'razorpay', providerOrderId: 'order_x', providerPaymentId: 'pay_x' },
    orderStatus: 'PAID', shipmentStatus: 'NOT_CREATED', createdAt: 't', updatedAt: 't',
  };
}

describe('AdminOrder DTO — no internal leakage', () => {
  it('omits internal id, accessTokenHash, userId, and the provider payment object', () => {
    const dto = toAdminOrder(order());
    for (const secret of ['id', 'accessTokenHash', 'userId', 'payment']) {
      expect(dto).not.toHaveProperty(secret);
    }
    const s = JSON.stringify(dto);
    expect(s).not.toContain('internal-doc-xyz');
    expect(s).not.toContain('deadbeef');
    // paymentStatus is surfaced (safe), but not provider ids on the order DTO.
    expect(dto.paymentStatus).toBe('CAPTURED');
  });
});

describe('order snapshots are historical — unaffected by product edits', () => {
  it('AdminOrder reflects the STORED snapshot values, not any live product', () => {
    const o = order();
    const dto = toAdminOrder(o);
    // The DTO reads item values straight from the order snapshot. There is no
    // product parameter/reference, so a later product price change cannot alter
    // this order.
    expect(dto.items[0]!.unitPrice).toBe(49900);
    expect(dto.items[0]!.lineSubtotal).toBe(99800);
    expect(dto.items[0]!.productTitleSnapshot).toBe('EVM Earphones');
    expect(dto.total).toBe(106600);
  });
});

describe('AdminPayment DTO — no secrets', () => {
  it('exposes only safe fields (no key/secret/webhook/raw payload)', () => {
    const rec: PaymentRecord = {
      paymentId: 'pay_ord1', orderId: 'ord1', orderReference: 'EVM-ABCD1234', ownerType: 'user',
      userId: 'userA', provider: 'razorpay', providerOrderId: 'order_x', providerPaymentId: 'pay_x',
      amount: 106600, currency: 'INR', status: 'CAPTURED', failureCode: null, failureReason: null,
      attempts: 1, createdAt: 't', updatedAt: 't', capturedAt: 't',
    };
    const dto = toAdminPayment(rec);
    expect(Object.keys(dto).sort()).toEqual(
      ['amount', 'attempts', 'capturedAt', 'createdAt', 'currency', 'failureReason', 'orderReference', 'provider', 'providerOrderId', 'providerPaymentId', 'status', 'updatedAt'].sort(),
    );
    const s = JSON.stringify(dto).toLowerCase();
    expect(s).not.toContain('secret');
    expect(s).not.toContain('webhook');
  });
});

describe('AdminCustomer DTO — no auth data', () => {
  it('exposes only allow-listed profile fields', () => {
    const u: UserProfile = {
      uid: 'userA', email: 'a@b.com', displayName: 'A', phone: '9', emailVerified: true,
      isActive: true, createdAt: 't', updatedAt: 't', lastLoginAt: 't',
    };
    const dto = toAdminCustomer(u);
    for (const forbidden of ['password', 'passwordHash', 'token', 'refreshToken', 'updatedAt']) {
      expect(dto).not.toHaveProperty(forbidden);
    }
    expect(dto.uid).toBe('userA');
  });
});
