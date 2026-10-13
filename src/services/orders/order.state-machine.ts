/**
 * Order + payment status state machines.
 *
 * Transitions are SERVER-CONTROLLED. There is no API in Phase 4 that lets a
 * client set a status, and these guards ensure that even server code can only
 * make valid transitions. PAYMENT_PENDING -> PAID is reachable only via a future
 * authorized payment service; it is a valid transition here but is never invoked
 * by any Phase 4 code path.
 */
import { AppError } from '@/lib/security/errors';
import type { OrderStatus, PaymentStatus } from './order.types';

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PAYMENT_PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUND_PENDING'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUND_PENDING'],
  REFUND_PENDING: ['REFUNDED'],
  REFUNDED: [],
  CANCELLED: [],
};

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['AUTHORIZED', 'CAPTURED', 'FAILED'],
  AUTHORIZED: ['CAPTURED', 'FAILED'],
  CAPTURED: ['REFUND_PENDING'],
  FAILED: [],
  REFUND_PENDING: ['REFUNDED'],
  REFUNDED: [],
};

export const INITIAL_ORDER_STATUS: OrderStatus = 'PAYMENT_PENDING';
export const INITIAL_PAYMENT_STATUS: PaymentStatus = 'PENDING';

/**
 * Statuses an ADMIN may set via the fulfillment endpoint. Payment/system-owned
 * statuses (PAID, REFUND_PENDING, REFUNDED, RETURN_*) are intentionally excluded
 * — those are driven by the payment/returns flows, never a manual admin toggle.
 */
export const ADMIN_SETTABLE_STATUSES: OrderStatus[] = [
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

/** Valid next statuses an admin may transition to from `from` (for UI buttons). */
export function adminAllowedNextStatuses(from: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS[from].filter((s) => ADMIN_SETTABLE_STATUSES.includes(s));
}

export function canOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}
export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canOrderTransition(from, to)) {
    throw new AppError('conflict', { internal: `illegal order transition ${from} -> ${to}` });
  }
}

export function canPaymentTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}
export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canPaymentTransition(from, to)) {
    throw new AppError('conflict', { internal: `illegal payment transition ${from} -> ${to}` });
  }
}
