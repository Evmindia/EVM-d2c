/**
 * Order -> PublicOrder mapper (allow-list). Excludes internal id,
 * accessTokenHash, userId, and any internal/cost/supplier/audit data. This is
 * the security boundary for customer-facing order responses.
 */
import type { Order, PublicOrder } from './order.types';

export function toPublicOrder(order: Order): PublicOrder {
  return {
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.payment.status,
    items: order.items.map((it) => ({
      productTitleSnapshot: it.productTitleSnapshot,
      sku: it.sku,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineSubtotal: it.lineSubtotal,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    couponCode: order.couponCode,
    tax: order.tax,
    shipping: order.shipping,
    total: order.total,
    currency: order.currency,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    shipmentStatus: order.shipmentStatus,
    // Only surface a real courier AWB to the customer — never a dev placeholder.
    awbNumber:
      order.shipmentProvider && order.shipmentProvider !== 'PLACEHOLDER'
        ? (order.awbNumber ?? null)
        : null,
    carrier:
      order.shipmentProvider && order.shipmentProvider !== 'PLACEHOLDER'
        ? order.shipmentProvider
        : null,
    createdAt: order.createdAt,
  };
}
