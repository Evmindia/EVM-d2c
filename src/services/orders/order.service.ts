import 'server-only';

/**
 * Order service — server-authoritative order creation + access.
 *
 * createOrder RECOMPUTES the checkout summary independently (never trusts a
 * preview or any client total). If commercial configuration (tax/shipping) is
 * incomplete, it REFUSES to create a misleading order and returns a clear
 * configuration_pending error. On success the order snapshots all commercial
 * facts and starts at PAYMENT_PENDING / payment PENDING.
 */
import { randomBytes, createHash } from 'node:crypto';
import { AppError } from '@/lib/security/errors';
import type { CartIdentity } from '@/services/cart/cart.service';
import { previewCheckout } from '@/services/checkout/checkout.service';
import { normalizeBillingAddress } from '@/services/checkout/checkout.validation';
import type { CheckoutInput, CheckoutSummary } from '@/services/checkout/checkout.types';
import { recordAudit } from '@/lib/audit/audit';
import { logger } from '@/lib/logger';
import { isEshipzShipmentConfigured, eshipzConfig } from '@/lib/eshipz/config';
import { createShipment } from '@/lib/eshipz/shipment';
import { sendOrderToTally } from '@/services/tally/tally.service';
import { getProductsByIds } from '@/services/catalog/product.service';
import {
  createOrderIdempotent,
  getByOrderNumber,
  getOrderById,
  patchOrder,
  listOrdersByUser,
  idempotencyDocId,
  requestFingerprint,
} from './order.repository';
import { generateOrderNumber } from './order-number';
import {
  INITIAL_ORDER_STATUS,
  INITIAL_PAYMENT_STATUS,
  ADMIN_SETTABLE_STATUSES,
  assertOrderTransition,
} from './order.state-machine';
import { toPublicOrder } from './order.dto';
import type { Order, OrderItem, OrderStatus, PublicOrder } from './order.types';

function identityKey(identity: CartIdentity): string {
  return identity.kind === 'user' ? `u:${identity.uid}` : `g:${identity.token}`;
}

export interface CreateOrderResultDTO {
  order: PublicOrder;
  /** Guest capability token — returned ONCE at creation (null for users). */
  accessToken: string | null;
  created: boolean;
}

/**
 * Create an order (idempotent). `preview` is ignored for authority — the summary
 * is recomputed here. Requires a server-supplied idempotency key.
 */
export async function createOrder(
  identity: CartIdentity,
  input: CheckoutInput,
  idempotencyKey: string,
): Promise<CreateOrderResultDTO> {
  // Recompute authoritative summary independently.
  const summary: CheckoutSummary = await previewCheckout(identity, input);

  if (summary.items.length === 0) {
    throw new AppError('bad_request', { internal: 'cannot create an order from an empty cart' });
  }
  if (summary.hasUnavailable) {
    throw new AppError('conflict', { internal: 'cart contains unavailable items' });
  }
  if (!summary.configurationComplete || summary.total === null) {
    // Do NOT create a misleading order when tax/shipping config is pending.
    throw new AppError('configuration_pending', {
      internal: { issues: summary.issues },
    });
  }

  const billingAddress = normalizeBillingAddress(input);
  const items: OrderItem[] = summary.items.map((it) => ({
    productId: it.productId,
    sku: it.sku,
    productTitleSnapshot: it.title,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    lineSubtotal: it.lineSubtotal,
  }));

  // Guest capability token (returned once); users rely on token ownership.
  const accessToken = identity.kind === 'guest' ? randomBytes(32).toString('hex') : null;
  const accessTokenHash = accessToken
    ? createHash('sha256').update(accessToken).digest('hex')
    : null;

  const now = new Date().toISOString();
  const orderData: Omit<Order, 'id'> = {
    orderNumber: generateOrderNumber(),
    ownerType: identity.kind === 'user' ? 'user' : 'guest',
    userId: identity.kind === 'user' ? identity.uid : null,
    accessTokenHash,
    customerName: input.customer.fullName,
    customerEmail: input.customer.email,
    customerPhone: input.customer.phone,
    shippingAddress: input.shippingAddress,
    billingAddress,
    items,
    subtotal: summary.subtotal,
    discount: summary.discount,
    couponCode: summary.couponCode,
    // Tax snapshot includes the GST breakdown (server-recalculated at creation),
    // so future catalog/rate changes never alter this historical order.
    tax: {
      status: summary.tax.status,
      amount: summary.tax.amount,
      breakdown: summary.tax.breakdown
        ? {
            cgst: summary.tax.breakdown.cgst,
            sgst: summary.tax.breakdown.sgst,
            igst: summary.tax.breakdown.igst,
            rate: summary.tax.breakdown.rate,
            intraState: summary.tax.breakdown.intraState,
          }
        : null,
    },
    shipping: { status: summary.shipping.status, amount: summary.shipping.amount },
    total: summary.total,
    currency: summary.currency,
    payment: {
      status: INITIAL_PAYMENT_STATUS,
      provider: null,
      providerOrderId: null,
      providerPaymentId: null,
    },
    orderStatus: INITIAL_ORDER_STATUS,
    shipmentStatus: 'NOT_CREATED',
    createdAt: now,
    updatedAt: now,
  };

  // Idempotency: same key + same request -> same order; different -> conflict.
  const fingerprint = requestFingerprint({ id: identityKey(identity), input });
  const { order, created } = await createOrderIdempotent(orderData, {
    docId: idempotencyDocId(identityKey(identity), idempotencyKey),
    fingerprint,
  });

  if (created) {
    await recordAudit({
      action: 'order.update',
      actorUid: identity.kind === 'user' ? identity.uid : 'guest',
      actorRole: identity.kind === 'user' ? 'customer' : 'guest',
      resourceType: 'order',
      resourceId: order.orderNumber,
      metadata: { event: 'order_created', total: order.total, itemCount: order.items.length },
    });
  }

  return {
    order: toPublicOrder(order),
    // On replay we don't re-issue the token (it isn't stored in plaintext).
    accessToken: created ? accessToken : null,
    created,
  };
}

/**
 * Fetch an order for a caller, enforcing access control.
 *  - Authenticated: the order must belong to the user's uid.
 *  - Guest: a valid capability token (matching accessTokenHash) is required.
 * Missing/mismatched access returns 404 (no existence leak).
 *
 * `capabilityToken` is the guest's access token (from a header/cookie), if any.
 */
export type OrderCaller = { uid: string | null; capabilityToken: string | null };

/**
 * Access-controlled fetch of the INTERNAL order entity (used by the payment
 * service). Same rule as getOrderForCaller: authenticated owner OR valid guest
 * capability token; otherwise not_found (no existence leak). Never returned to
 * the client directly — callers map to a DTO.
 */
export async function getOrderEntityForCaller(
  orderNumber: string,
  caller: OrderCaller,
): Promise<Order> {
  const order = await getByOrderNumber(orderNumber);
  if (!order) throw new AppError('not_found');

  const ownedByUser = caller.uid !== null && order.userId === caller.uid;
  const guestCapable =
    order.accessTokenHash !== null &&
    caller.capabilityToken !== null &&
    timingSafeEqualHex(
      createHash('sha256').update(caller.capabilityToken).digest('hex'),
      order.accessTokenHash,
    );

  if (!ownedByUser && !guestCapable) {
    throw new AppError('not_found');
  }
  return order;
}

export async function getOrderForCaller(
  orderNumber: string,
  caller: OrderCaller,
): Promise<PublicOrder> {
  return toPublicOrder(await getOrderEntityForCaller(orderNumber, caller));
}

/**
 * Transition an order to PAID — SERVER-ONLY, called ONLY by the trusted payment
 * service after verified capture. Idempotent (already-PAID is a no-op). The
 * state machine rejects illegal transitions (e.g. CANCELLED/REFUNDED -> PAID).
 */
export async function markOrderPaid(orderId: string): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) throw new AppError('not_found');
  if (order.orderStatus === 'PAID') return; // idempotent
  assertOrderTransition(order.orderStatus, 'PAID');
  await patchOrder(orderId, { orderStatus: 'PAID' });
}

/**
 * Total shipment weight (kg) for an order, summed from each product's
 * `weightGrams` × quantity. Falls back to the configured safety-net weight only
 * when no product has a weight set (so a shipment never fails on missing data).
 */
async function computeOrderWeightKg(order: Order): Promise<number> {
  const ids = [...new Set(order.items.map((i) => i.productId))];
  const products = await getProductsByIds(ids);
  let grams = 0;
  for (const it of order.items) {
    const p = products.get(it.productId);
    const w = p && typeof p.weightGrams === 'number' ? p.weightGrams : 0;
    grams += w * it.quantity;
  }
  const kg = grams / 1000;
  if (kg <= 0) {
    logger.warn('order_weight_missing', { order: order.orderNumber });
    return eshipzConfig().fallbackWeightKg;
  }
  return Math.round(kg * 1000) / 1000;
}

/**
 * ADMIN fulfillment transition. Advances an order's status through the
 * admin-settable lifecycle (PROCESSING → PACKED → SHIPPED → OUT_FOR_DELIVERY →
 * DELIVERED, or CANCELLED). The state machine rejects illegal jumps and
 * payment/system-owned statuses are refused.
 *
 * SHIPMENT: on the transition to SHIPPED a shipment is created. Until Blue Dart's
 * GenerateWayBill API is wired, a clearly-marked PLACEHOLDER AWB is stored (never
 * a fabricated real Blue Dart number). Swap `createShipment` for the real call
 * once credentials/specs are available — the surrounding flow stays identical.
 *
 * Authorization (admin + orders:update/orders:cancel) is enforced at the API
 * layer; this function trusts its caller and records the actor for audit.
 */
export async function adminAdvanceOrderStatus(
  orderNumber: string,
  to: OrderStatus,
  actor: { uid: string; role: string; requestId?: string },
): Promise<Order> {
  const order = await getByOrderNumber(orderNumber);
  if (!order) throw new AppError('not_found');

  if (!ADMIN_SETTABLE_STATUSES.includes(to)) {
    throw new AppError('forbidden', { internal: `status ${to} is not admin-settable` });
  }
  assertOrderTransition(order.orderStatus, to);

  const patch: Partial<Order> = { orderStatus: to };

  if (to === 'SHIPPED' && !order.awbNumber) {
    if (isEshipzShipmentConfigured()) {
      // Real eShipz shipment. Any failure throws here (network/auth/business),
      // so the order is NOT marked shipped on failure — the admin sees an error.
      const weightKg = await computeOrderWeightKg(order);
      const result = await createShipment(order, weightKg);
      patch.shipmentStatus = 'CREATED';
      patch.awbNumber = result.awbNumber;
      patch.shipmentProvider = result.carrierSlug; // carrier eShipz auto-selected
      if (result.labelUrl) patch.awbLabelUrl = result.labelUrl;
    } else {
      // PLACEHOLDER shipment until eShipz credentials are configured.
      patch.shipmentStatus = 'CREATED';
      patch.awbNumber = `PLACEHOLDER-${order.orderNumber}`;
      patch.shipmentProvider = 'PLACEHOLDER';
    }
  }
  if (to === 'CANCELLED' && order.shipmentStatus !== 'NOT_CREATED') {
    patch.shipmentStatus = 'CANCELLED';
  }

  await patchOrder(order.id, patch);

  await recordAudit({
    action: to === 'CANCELLED' ? 'order.cancel' : 'order.update',
    actorUid: actor.uid,
    actorRole: actor.role,
    resourceType: 'order',
    resourceId: order.orderNumber,
    requestId: actor.requestId,
    metadata: {
      event: 'status_change',
      from: order.orderStatus,
      to,
      ...(patch.awbNumber ? { awbNumber: patch.awbNumber } : {}),
    },
  });

  const updated = await getOrderById(order.id);
  if (!updated) throw new AppError('internal_error', { internal: 'order vanished after patch' });

  if (to === 'SHIPPED') {
    // Non-blocking trigger to push order voucher to Tally ERP
    sendOrderToTally(updated).catch((err) => {
      logger.error('tally_auto_sync_on_shipped_failed', {
        orderNumber: updated.orderNumber,
        err: String(err),
      });
    });
  }

  return updated;
}

/**
 * List the authenticated user's own orders (public DTOs). Ownership is enforced
 * by querying on the verified uid — a user can never see another user's orders.
 */
export async function listOrdersForUser(uid: string): Promise<PublicOrder[]> {
  const orders = await listOrdersByUser(uid);
  return orders.map(toPublicOrder);
}

/** Constant-time-ish comparison of two equal-length hex strings. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
