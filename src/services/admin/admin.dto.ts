/**
 * Admin response DTOs — explicit allow-lists. Admin APIs return ONLY these
 * shapes, never raw Firestore documents. They deliberately exclude secrets,
 * auth/session data, webhook payloads, and internal-only fields.
 */
import type { Order } from '@/services/orders/order.types';
import { adminAllowedNextStatuses } from '@/services/orders/order.state-machine';
import type { PaymentRecord } from '@/services/payments/payment.types';
import type { UserProfile } from '@/services/users/user.types';

// ---- Dashboard --------------------------------------------------------------
export interface AdminDashboard {
  products: { total: number | null; active: number | null; outOfStock: number | null };
  orders: { total: number | null; paymentPending: number | null; paid: number | null };
  recentOrders: AdminOrderSummary[];
  recentActivity: AuditEventDTO[];
  // Financial aggregates are intentionally omitted (no fake revenue).
  notes: string[];
}

// ---- Orders -----------------------------------------------------------------
export interface AdminOrderSummary {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  total: number;
  currency: string;
  customerEmail: string;
  createdAt: string;
}

export interface AdminOrder extends AdminOrderSummary {
  ownerType: 'guest' | 'user';
  items: {
    productTitleSnapshot: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineSubtotal: number;
  }[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  tax: { status: string; amount: number | null };
  shipping: { status: string; amount: number | null };
  shipmentStatus: string;
  awbNumber: string | null;
  shipmentProvider: string | null;
  /** Direct courier label URL (eShipz), if any. */
  labelUrl: string | null;
  /** True when a label is available (hosted URL or stored PDF). */
  hasLabel: boolean;
  /** Valid fulfillment transitions an admin may apply next (for action buttons). */
  allowedNextStatuses: string[];
  customerName: string;
  customerPhone: string;
  shippingAddress: Order['shippingAddress'];
  billingAddress: Order['billingAddress'];
  tallyStatus: 'SENT' | 'FAILED' | 'PENDING' | null;
  tallySyncedAt: string | null;
}

export function toAdminOrderSummary(o: Order): AdminOrderSummary {
  return {
    orderNumber: o.orderNumber,
    orderStatus: o.orderStatus,
    paymentStatus: o.payment.status,
    total: o.total,
    currency: o.currency,
    customerEmail: o.customerEmail,
    createdAt: o.createdAt,
  };
}

export function toAdminOrder(o: Order): AdminOrder {
  return {
    ...toAdminOrderSummary(o),
    ownerType: o.ownerType,
    items: o.items.map((it) => ({
      productTitleSnapshot: it.productTitleSnapshot,
      sku: it.sku,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineSubtotal: it.lineSubtotal,
    })),
    subtotal: o.subtotal,
    discount: o.discount,
    couponCode: o.couponCode,
    tax: o.tax,
    shipping: o.shipping,
    shipmentStatus: o.shipmentStatus,
    awbNumber: o.awbNumber ?? null,
    shipmentProvider: o.shipmentProvider ?? null,
    labelUrl: o.awbLabelUrl ?? null,
    hasLabel: Boolean(o.awbLabelUrl || o.awbLabelPath),
    allowedNextStatuses: adminAllowedNextStatuses(o.orderStatus),
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    shippingAddress: o.shippingAddress,
    billingAddress: o.billingAddress,
    tallyStatus: o.tallyStatus ?? 'PENDING',
    tallySyncedAt: o.tallySyncedAt ?? null,
  };
}

// ---- Payments (VIEW-ONLY; no secrets) --------------------------------------
export interface AdminPayment {
  orderReference: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  attempts: number;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  capturedAt: string | null;
}

export function toAdminPayment(p: PaymentRecord): AdminPayment {
  // Deliberately omits any secret/credential/raw-payload field (none stored).
  return {
    orderReference: p.orderReference,
    provider: p.provider,
    status: p.status,
    amount: p.amount,
    currency: p.currency,
    providerOrderId: p.providerOrderId,
    providerPaymentId: p.providerPaymentId,
    attempts: p.attempts,
    failureReason: p.failureReason,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    capturedAt: p.capturedAt,
  };
}

// ---- Customers --------------------------------------------------------------
export interface AdminCustomer {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export function toAdminCustomer(u: UserProfile): AdminCustomer {
  // Never exposes password/hash/tokens (none stored) or raw user doc.
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    phone: u.phone,
    emailVerified: u.emailVerified,
    isActive: u.isActive,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}

// ---- Audit events -----------------------------------------------------------
export interface AuditEventDTO {
  eventId: string;
  action: string;
  actorUid: string;
  actorRole: string;
  targetType: string;
  targetId: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
