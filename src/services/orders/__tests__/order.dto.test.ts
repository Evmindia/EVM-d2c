import { describe, it, expect } from 'vitest';
import { toPublicOrder } from '@/services/orders/order.dto';
import type { Order } from '@/services/orders/order.types';

function order(): Order {
  const addr = {
    fullName: 'Asha', phone: '9876543210', addressLine1: '12 MG Road',
    city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'IN',
  };
  return {
    id: 'internal-doc-id-xyz',
    orderNumber: 'EVM-ABCD1234',
    ownerType: 'user',
    userId: 'userA',
    accessTokenHash: 'deadbeef'.repeat(8),
    customerName: 'Asha',
    customerEmail: 'asha@example.com',
    customerPhone: '9876543210',
    shippingAddress: addr,
    billingAddress: addr,
    items: [
      { productId: 'p1', sku: 'P1', productTitleSnapshot: 'EVM Earphones', quantity: 2, unitPrice: 49900, lineSubtotal: 99800 },
    ],
    subtotal: 99800,
    discount: 0,
    couponCode: null,
    tax: { status: 'CONFIGURED', amount: 1800 },
    shipping: { status: 'CONFIGURED', amount: 5000 },
    total: 106600,
    currency: 'INR',
    payment: { status: 'PENDING', provider: null, providerOrderId: null, providerPaymentId: null },
    orderStatus: 'PAYMENT_PENDING',
    shipmentStatus: 'NOT_CREATED',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('public order DTO — no internal leakage', () => {
  it('omits internal id, accessTokenHash, userId, and ownerType', () => {
    const pub = toPublicOrder(order());
    for (const secret of ['id', 'accessTokenHash', 'userId', 'ownerType']) {
      expect(pub).not.toHaveProperty(secret);
    }
    const serialized = JSON.stringify(pub);
    expect(serialized).not.toContain('internal-doc-id-xyz');
    expect(serialized).not.toContain('deadbeef');
  });

  it('exposes shipmentStatus, but only a REAL courier AWB (never a placeholder)', () => {
    // Placeholder shipment → AWB withheld from the customer.
    const placeholder = { ...order(), shipmentProvider: 'PLACEHOLDER', awbNumber: 'PLACEHOLDER-EVM-ABCD1234' };
    const pubP = toPublicOrder(placeholder);
    expect(pubP.shipmentStatus).toBe('NOT_CREATED');
    expect(pubP.awbNumber).toBeNull();

    // Real BlueDart shipment → AWB exposed for tracking.
    const real = { ...order(), shipmentStatus: 'CREATED' as const, shipmentProvider: 'BLUEDART', awbNumber: '76662235090' };
    const pubR = toPublicOrder(real);
    expect(pubR.shipmentStatus).toBe('CREATED');
    expect(pubR.awbNumber).toBe('76662235090');
  });

  it('flattens payment to a paymentStatus and keeps allow-listed fields', () => {
    const pub = toPublicOrder(order());
    expect(pub.paymentStatus).toBe('PENDING');
    expect(pub).not.toHaveProperty('payment'); // no provider object exposed
    expect(pub.orderNumber).toBe('EVM-ABCD1234');
    expect(pub.total).toBe(106600);
    expect(pub.items[0]!.productTitleSnapshot).toBe('EVM Earphones');
  });
});
