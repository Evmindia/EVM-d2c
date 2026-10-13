import 'server-only';

/**
 * Admin operations service — orchestrates admin reads over existing services /
 * repositories and maps everything to allow-listed DTOs. Contains no business
 * logic that belongs to the domain services (it reuses product/order/user/
 * payment services). No secrets, no raw documents.
 */
import { AppError } from '@/lib/security/errors';
import { adminCountProducts } from '@/services/catalog/product.service';
import {
  adminListOrders,
  adminFindOrdersByEmail,
  adminCountOrders,
  getByOrderNumber,
  patchOrder,
} from '@/services/orders/order.repository';
import { adminAdvanceOrderStatus } from '@/services/orders/order.service';
import { assertOrderTransition } from '@/services/orders/order.state-machine';
import type { OrderStatus } from '@/services/orders/order.types';
import { recordAudit } from '@/lib/audit/audit';
import { isProduction } from '@/lib/config/env';
import { readWaybillLabel } from '@/lib/bluedart/label';
import {
  adminListUsers,
  adminFindUsers,
  adminGetUser,
  adminSetUserActive,
} from '@/services/users/user.repository';
import { getPaymentByOrderId } from '@/services/payments/payment.repository';
import { listAuditEvents } from './admin.audit.service';
import {
  toAdminOrder,
  toAdminOrderSummary,
  toAdminCustomer,
  toAdminPayment,
  type AdminDashboard,
  type AdminOrder,
  type AdminOrderSummary,
  type AdminCustomer,
  type AdminPayment,
} from './admin.dto';

// ---- Dashboard --------------------------------------------------------------
/**
 * Bounded operational summary. Uses count() aggregation (no full scans) and a
 * small recent-orders/activity page. Financial aggregates are intentionally
 * omitted (no fake revenue). Any count that fails is reported as null (N/A).
 */
export async function getDashboard(): Promise<AdminDashboard> {
  const safe = async (p: Promise<number>): Promise<number | null> => {
    try {
      return await p;
    } catch {
      return null;
    }
  };

  const [
    totalProducts,
    activeProducts,
    outOfStock,
    totalOrders,
    paymentPending,
    paid,
    recentOrdersRaw,
    recentActivity,
  ] = await Promise.all([
    safe(adminCountProducts()),
    safe(adminCountProducts({ isActive: true })),
    safe(adminCountProducts({ stockStatus: 'out_of_stock' })),
    safe(adminCountOrders()),
    safe(adminCountOrders('PAYMENT_PENDING')),
    safe(adminCountOrders('PAID')),
    adminListOrders({ limit: 10 }).catch(() => []),
    listAuditEvents({ limit: 10 }).catch(() => []),
  ]);

  return {
    products: { total: totalProducts, active: activeProducts, outOfStock },
    orders: { total: totalOrders, paymentPending, paid },
    recentOrders: recentOrdersRaw.map(toAdminOrderSummary),
    recentActivity,
    notes: [
      'Financial revenue metrics are not shown (no aggregation layer configured).',
      'Inventory configuration pending — stock is view-only.',
    ],
  };
}

// ---- Orders -----------------------------------------------------------------
export async function listAdminOrders(opts: {
  status?: string;
  limit: number;
}): Promise<AdminOrderSummary[]> {
  const orders = await adminListOrders(opts);
  return orders.map(toAdminOrderSummary);
}

export async function searchAdminOrders(email: string): Promise<AdminOrderSummary[]> {
  const orders = await adminFindOrdersByEmail(email);
  return orders.map(toAdminOrderSummary);
}

export async function getAdminOrder(orderNumber: string): Promise<AdminOrder> {
  const order = await getByOrderNumber(orderNumber);
  if (!order) throw new AppError('not_found');
  return toAdminOrder(order);
}

/**
 * Admin fulfillment transition (approve/pack/ship/deliver/cancel). Delegates the
 * state-machine + placeholder-shipment logic to the order service, then maps to
 * the allow-listed AdminOrder DTO. Authorization is enforced at the API layer.
 */
export async function advanceAdminOrder(
  orderNumber: string,
  to: OrderStatus,
  actor: { uid: string; role: string; requestId?: string },
): Promise<AdminOrder> {
  const order = await adminAdvanceOrderStatus(orderNumber, to, actor);
  return toAdminOrder(order);
}

import { sendOrderToTally } from '@/services/tally/tally.service';

/**
 * TEST-ONLY: mark an order PAID without a real payment. Refused in production —
 * this exists solely to exercise the fulfillment/shipping flow before the
 * payment gateway is wired. Sets orderStatus PAID + payment CAPTURED.
 */
export async function markAdminOrderPaidForTest(
  orderNumber: string,
  actor: { uid: string; role: string; requestId?: string },
): Promise<AdminOrder> {
  if (isProduction) {
    throw new AppError('forbidden', { internal: 'mark-paid is disabled in production' });
  }
  const order = await getByOrderNumber(orderNumber);
  if (!order) throw new AppError('not_found');
  if (order.orderStatus !== 'PAID') {
    assertOrderTransition(order.orderStatus, 'PAID'); // only from PAYMENT_PENDING
    await patchOrder(order.id, {
      orderStatus: 'PAID',
      payment: { ...order.payment, status: 'CAPTURED' },
    });
    await recordAudit({
      action: 'order.update',
      actorUid: actor.uid,
      actorRole: actor.role,
      resourceType: 'order',
      resourceId: order.orderNumber,
      requestId: actor.requestId,
      metadata: { event: 'test_mark_paid' },
    });

    const updated = await getByOrderNumber(orderNumber);
    if (updated) {
      sendOrderToTally(updated).catch(() => {});
    }
  }
  const updated = await getByOrderNumber(orderNumber);
  return toAdminOrder(updated!);
}

/** Download the stored shipping-label PDF for an order. */
export async function getOrderLabel(orderNumber: string): Promise<Buffer> {
  const order = await getByOrderNumber(orderNumber);
  if (!order || !order.awbLabelPath) throw new AppError('not_found');
  return readWaybillLabel(order.awbLabelPath);
}

// ---- Payments (view-only) ---------------------------------------------------
export async function getAdminPayment(orderNumber: string): Promise<AdminPayment | null> {
  const order = await getByOrderNumber(orderNumber);
  if (!order) throw new AppError('not_found');
  const record = await getPaymentByOrderId(order.id);
  return record ? toAdminPayment(record) : null;
}

// ---- Customers --------------------------------------------------------------
export async function listAdminCustomers(limit: number): Promise<AdminCustomer[]> {
  return (await adminListUsers(limit)).map(toAdminCustomer);
}

export async function searchAdminCustomers(
  field: 'email' | 'phone',
  value: string,
): Promise<AdminCustomer[]> {
  return (await adminFindUsers(field, value)).map(toAdminCustomer);
}

export async function getAdminCustomer(uid: string): Promise<AdminCustomer> {
  const user = await adminGetUser(uid);
  if (!user) throw new AppError('not_found');
  return toAdminCustomer(user);
}

/** Set a customer's account active status (superadmin/users:manage gated by API). */
export async function setCustomerActive(uid: string, isActive: boolean): Promise<AdminCustomer> {
  const user = await adminSetUserActive(uid, isActive);
  if (!user) throw new AppError('not_found');
  return toAdminCustomer(user);
}
