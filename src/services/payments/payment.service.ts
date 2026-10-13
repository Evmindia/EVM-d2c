import 'server-only';

/**
 * Payment service — vendor-neutral orchestration + security invariants.
 *
 * This is the ONLY place the app performs payment business logic. It depends on
 * the PaymentProvider interface, not a concrete gateway. In Phase 1 the concrete
 * gateway is PENDING, so provider-touching methods surface a safe not_implemented
 * error; the server-authoritative pieces that DON'T need the gateway (amount
 * calculation, state-machine validation) are implemented and tested now.
 */
import type { MoneyAmount } from './payment.types';
import { AppError } from '@/lib/security/errors';

// NOTE: the authoritative payment state machine lives in
// services/orders/order.state-machine.ts (assertPaymentTransition). The
// Razorpay orchestration below uses it. computeOrderAmount remains here as the
// server-authoritative amount helper.

/**
 * Compute the authoritative order amount SERVER-SIDE from trusted line items.
 * Client-sent totals are ignored entirely — this is the anti price-manipulation
 * control. Line prices here are expected to come from the DB (later phases),
 * never from the request.
 */
export interface ServerLineItem {
  /** Unit price in smallest currency unit (paise), from the DB. */
  unitPrice: number;
  quantity: number;
}

export function computeOrderAmount(
  items: ServerLineItem[],
  opts: { shippingFee?: number; discount?: number; taxRate?: number } = {},
): MoneyAmount {
  if (items.length === 0) {
    throw new AppError('bad_request', { internal: 'empty cart' });
  }
  let subtotal = 0;
  for (const item of items) {
    if (!Number.isInteger(item.unitPrice) || item.unitPrice < 0) {
      throw new AppError('bad_request', { internal: 'invalid unit price' });
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new AppError('bad_request', { internal: 'invalid quantity' });
    }
    subtotal += item.unitPrice * item.quantity;
  }
  const discount = Math.max(0, Math.floor(opts.discount ?? 0));
  const shipping = Math.max(0, Math.floor(opts.shippingFee ?? 0));
  const taxable = Math.max(0, subtotal - discount);
  const tax = opts.taxRate ? Math.round(taxable * opts.taxRate) : 0;
  const total = taxable + shipping + tax;
  if (total <= 0) {
    throw new AppError('bad_request', { internal: 'non-positive order total' });
  }
  return { value: total, currency: 'INR' };
}

// ============================================================================
// Payment orchestration (provider-agnostic; talks only to PaymentProvider)
// ============================================================================
import { getPaymentProvider } from './provider.factory';
import {
  getPaymentByOrderId,
  getPaymentByProviderOrderId,
  upsertPayment,
  patchPayment,
  captureAtomically,
  claimWebhookEvent,
} from './payment.repository';
import { getOrderEntityForCaller, type OrderCaller } from '@/services/orders/order.service';
import { getOrderById, getByOrderNumber } from '@/services/orders/order.repository';
import { assertPaymentTransition } from '@/services/orders/order.state-machine';
import { recordAudit } from '@/lib/audit/audit';
import { logger } from '@/lib/logger';
import type { Order } from '@/services/orders/order.types';
import type {
  CheckoutInit,
  PublicPayment,
  PaymentRecord,
  PaymentStatus,
} from './payment.types';

/** Webhook events we actually process; everything else is ignored safely. */
const WEBHOOK_EVENT_ALLOWLIST = new Set([
  'payment.captured',
  'payment.authorized',
  'payment.failed',
  'ORDER_SUCCEEDED',
  'CHARGED',
  'TXN_CHARGED',
  'ORDER_FAILED',
]);

/** An order is payable only when awaiting payment and not already paid. */
function assertOrderPayable(order: Order): void {
  if (order.orderStatus !== 'PAYMENT_PENDING') {
    throw new AppError('conflict', { internal: `order not payable (status ${order.orderStatus})` });
  }
  if (order.payment.status === 'CAPTURED') {
    throw new AppError('conflict', { internal: 'order already paid' });
  }
}

function publicPayment(rec: PaymentRecord): PublicPayment {
  return {
    orderReference: rec.orderReference,
    status: rec.status,
    amount: rec.amount,
    currency: rec.currency,
  };
}

import { sendOrderToTally } from '@/services/tally/tally.service';

/**
 * Internal inventory-reservation & ERP sync hook. Invoked exactly once on first capture
 * so the invoice is auto-generated and posted to Tally.
 */
async function onPaymentCaptured(order: Order): Promise<void> {
  logger.info('payment_captured_hook', { orderReference: order.orderNumber });
  sendOrderToTally(order).catch((err) => {
    logger.error('tally_async_error', { orderReference: order.orderNumber, error: String(err) });
  });
}

/**
 * Create (or reuse) a provider order for an internal order and return
 * browser-safe checkout info. Amount/currency come ONLY from the server order.
 */
export async function createPaymentForOrder(
  caller: OrderCaller,
  orderReference: string,
): Promise<CheckoutInit> {
  const order = await getOrderEntityForCaller(orderReference, caller); // authz + IDOR
  assertOrderPayable(order);

  const provider = await getPaymentProvider();
  const now = new Date().toISOString();

  // Reuse an existing provider order for this internal order if one is pending.
  const existing = await getPaymentByOrderId(order.id);
  if (
    existing &&
    existing.providerOrderId &&
    existing.status === 'PENDING' &&
    provider.id !== 'smartgateway'
  ) {
    return {
      provider: provider.id,
      keyId: provider.publicKey(),
      providerOrderId: existing.providerOrderId,
      amount: order.total,
      currency: order.currency,
      orderReference: order.orderNumber,
    };
  }

  // Amount is the authoritative server total (integer paise). Never client input.
  const created = await provider.createOrder({
    orderId: order.orderNumber,
    amount: { value: order.total, currency: order.currency },
    idempotencyKey: `order:${order.id}`,
    customerEmail: order.customerEmail,
  });

  // Server cross-check: provider order amount/currency must equal ours.
  if (created.amount.value !== order.total || created.amount.currency !== order.currency) {
    logger.error('payment_amount_mismatch_on_create', { orderReference: order.orderNumber });
    throw new AppError('internal_error', { internal: 'provider order amount mismatch' });
  }

  const record: Omit<PaymentRecord, 'paymentId'> = {
    orderId: order.id,
    orderReference: order.orderNumber,
    ownerType: order.ownerType,
    userId: order.userId,
    provider: provider.id,
    providerOrderId: created.providerOrderId,
    providerPaymentId: existing?.providerPaymentId ?? null,
    amount: order.total,
    currency: order.currency,
    status: 'PENDING',
    failureCode: null,
    failureReason: null,
    attempts: (existing?.attempts ?? 0) + 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    capturedAt: null,
  };
  await upsertPayment(record);
  await recordAudit({
    action: 'order.update',
    actorUid: order.userId ?? 'guest',
    actorRole: order.userId ? 'customer' : 'guest',
    resourceType: 'payment',
    resourceId: order.orderNumber,
    metadata: { event: 'payment_initiated', provider: provider.id },
  });

  return {
    provider: provider.id,
    keyId: provider.publicKey(),
    providerOrderId: created.providerOrderId,
    amount: order.total,
    currency: order.currency,
    orderReference: order.orderNumber,
    paymentUrl: created.checkoutPayload?.paymentUrl,
    checkoutPayload: created.checkoutPayload,
  };
}

export interface VerifyInput {
  orderReference: string;
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

/**
 * Verify a client-reported payment. Cryptographically verifies the provider
 * signature, cross-checks the provider order id + amount + currency + state
 * against our server record, then (idempotently) captures the payment and marks
 * the order PAID. Never trusts a browser "success".
 */
export async function verifyAndCapture(
  caller: OrderCaller,
  input: VerifyInput,
): Promise<PublicPayment> {
  const order = await getOrderEntityForCaller(input.orderReference, caller); // authz + IDOR
  const record = await getPaymentByOrderId(order.id);
  if (!record || !record.providerOrderId) {
    throw new AppError('bad_request', { internal: 'no payment initiated for this order' });
  }
  // The provider order id in the request must match our stored record.
  if (input.providerOrderId !== record.providerOrderId) {
    await auditPaymentFailure(order, 'provider_order_mismatch');
    throw new AppError('bad_request', { internal: 'provider order id mismatch' });
  }

  const provider = await getPaymentProvider();
  const result = await provider.verifyPayment({
    orderId: order.orderNumber,
    providerOrderId: input.providerOrderId,
    providerPaymentId: input.providerPaymentId,
    signature: input.signature,
  });

  if (!result.verified) {
    await auditPaymentFailure(order, 'signature_invalid');
    await patchPayment(order.id, { status: 'FAILED', failureReason: 'signature_invalid' });
    throw new AppError('bad_request', { internal: 'payment signature verification failed' });
  }

  await applyVerifiedPayment(order, record, {
    providerPaymentId: result.providerPaymentId,
    providerOrderId: result.providerOrderId,
    amount: result.amount,
    currency: result.currency,
    status: result.status,
  });

  const updated = (await getPaymentByOrderId(order.id))!;
  return publicPayment(updated);
}

/**
 * Verify a payment triggered via provider redirect callback.
 * Looks up the order by reference, calls the provider's authoritative check,
 * and captures if valid.
 */
export async function verifyAndCaptureCallback(
  orderReference: string,
  input: {
    providerOrderId: string;
    providerPaymentId?: string;
    signature?: string;
  },
): Promise<PublicPayment> {
  const order = await getByOrderNumber(orderReference);
  if (!order) {
    throw new AppError('not_found', { internal: `order ${orderReference} not found` });
  }

  const record = await getPaymentByOrderId(order.id);
  if (!record || !record.providerOrderId) {
    throw new AppError('bad_request', { internal: 'no payment initiated for this order' });
  }

  const provider = await getPaymentProvider();
  const result = await provider.verifyPayment({
    orderId: order.orderNumber,
    providerOrderId: input.providerOrderId,
    providerPaymentId: input.providerPaymentId || input.providerOrderId,
    signature: input.signature || '',
  });

  if (!result.verified) {
    await auditPaymentFailure(order, 'callback_verification_unconfirmed');
    // If provider explicitly marked failed, patch record
    if (result.status === 'FAILED') {
      await patchPayment(order.id, { status: 'FAILED', failureReason: 'provider_reported_failure' });
    }
    throw new AppError('bad_request', { internal: 'payment unconfirmed by provider' });
  }

  await applyVerifiedPayment(order, record, {
    providerPaymentId: result.providerPaymentId,
    providerOrderId: result.providerOrderId,
    amount: result.amount,
    currency: result.currency,
    status: result.status,
  });

  const updated = (await getPaymentByOrderId(order.id))!;
  return publicPayment(updated);
}

/**
 * Shared, idempotent "apply a verified payment" routine used by BOTH the verify
 * endpoint and the webhook. Cross-checks amount/currency/order and transitions
 * state. Safe to call multiple times (already-captured is a no-op).
 */
async function applyVerifiedPayment(
  order: Order,
  record: PaymentRecord,
  p: {
    providerPaymentId: string;
    providerOrderId: string | null;
    amount: number | null;
    currency: string | null;
    status: PaymentStatus;
  },
): Promise<void> {
  // Cross-checks against the authoritative order record.
  if (p.providerOrderId && p.providerOrderId !== record.providerOrderId) {
    await auditPaymentFailure(order, 'webhook_order_mismatch');
    throw new AppError('bad_request', { internal: 'payment belongs to a different provider order' });
  }
  if (p.amount !== null && p.amount !== order.total) {
    await auditPaymentFailure(order, 'amount_mismatch');
    throw new AppError('bad_request', { internal: 'payment amount mismatch' });
  }
  if (p.currency !== null && p.currency !== order.currency) {
    await auditPaymentFailure(order, 'currency_mismatch');
    throw new AppError('bad_request', { internal: 'payment currency mismatch' });
  }

  // FAILED: record the failure; the order stays PAYMENT_PENDING (retryable).
  if (p.status === 'FAILED') {
    await patchPayment(order.id, { status: 'FAILED', providerPaymentId: p.providerPaymentId });
    return;
  }
  // Only authorization/capture events carry further meaning.
  if (p.status !== 'CAPTURED' && p.status !== 'AUTHORIZED') {
    return; // nothing to do for other states
  }
  // Record-level idempotency: already captured -> nothing to do (covers "same
  // payment, different event id" once capture has happened).
  if (record.status === 'CAPTURED') return;

  // AUTHORIZED (not captured): the money is held, NOT settled. Record the
  // authorization; the order MUST remain PAYMENT_PENDING (never PAID).
  if (p.status === 'AUTHORIZED') {
    assertPaymentTransition(record.status, 'AUTHORIZED');
    await patchPayment(order.id, { status: 'AUTHORIZED', providerPaymentId: p.providerPaymentId });
    return;
  }

  // CAPTURED: atomically set payment=CAPTURED AND order=PAID in one transaction
  // (order/payment transitions asserted in-tx). Side effects fire only on the
  // FIRST genuine capture — never on authorization, failure, or a duplicate.
  const { firstCapture } = await captureAtomically({
    orderId: order.id,
    providerPaymentId: p.providerPaymentId,
    provider: record.provider,
    providerOrderId: record.providerOrderId,
  });
  if (firstCapture) {
    await onPaymentCaptured(order);
    await recordAudit({
      action: 'order.update',
      actorUid: order.userId ?? 'guest',
      actorRole: order.userId ? 'customer' : 'guest',
      resourceType: 'payment',
      resourceId: order.orderNumber,
      metadata: { event: 'payment_captured' },
    });
  }
}

async function auditPaymentFailure(order: Order, reason: string): Promise<void> {
  logger.warn('payment_verification_failed', { orderReference: order.orderNumber, reason });
  await recordAudit({
    action: 'order.update',
    actorUid: order.userId ?? 'guest',
    actorRole: order.userId ? 'customer' : 'guest',
    resourceType: 'payment',
    resourceId: order.orderNumber,
    metadata: { event: 'payment_verification_failed', reason },
  });
}

/** Customer-facing payment status (allow-listed DTO). */
export async function getPaymentStatus(
  caller: OrderCaller,
  orderReference: string,
): Promise<PublicPayment> {
  const order = await getOrderEntityForCaller(orderReference, caller); // authz + IDOR
  const record = await getPaymentByOrderId(order.id);
  if (!record) {
    return { orderReference: order.orderNumber, status: 'PENDING', amount: order.total, currency: order.currency };
  }
  return publicPayment(record);
}

/**
 * Retry payment for an eligible PAYMENT_PENDING order — creates a fresh provider
 * order attempt associated with the same internal order. Ineligible states
 * (PAID/CANCELLED/REFUNDED) are rejected by assertOrderPayable.
 */
export async function retryPayment(
  caller: OrderCaller,
  orderReference: string,
): Promise<CheckoutInit> {
  // createPaymentForOrder already enforces payable state + ownership; for retry
  // we force a new provider order by clearing the reuse path.
  const order = await getOrderEntityForCaller(orderReference, caller);
  assertOrderPayable(order);
  await patchPayment(order.id, { status: 'PENDING', providerOrderId: null });
  return createPaymentForOrder(caller, orderReference);
}

/**
 * Process a Razorpay webhook. The RAW body is verified (signature) by the
 * provider BEFORE parsing. Idempotent by event id. Amount/currency/order are
 * cross-checked. Unsupported events are ignored safely. Returns a small result
 * describing what happened (for the route to choose a status code).
 */
export async function processWebhook(
  rawBody: string,
  headers: Record<string, string>,
): Promise<{ ok: boolean; handled: boolean; reason?: string }> {
  const provider = await getPaymentProvider();
  const verified = await provider.verifyWebhook(rawBody, headers);

  if (!verified.valid) {
    logger.warn('webhook_rejected', { reason: 'invalid_signature' });
    await recordAudit({
      action: 'order.update',
      actorUid: 'system',
      actorRole: 'system',
      resourceType: 'payment',
      metadata: { event: 'webhook_rejected', reason: 'invalid_signature' },
    });
    return { ok: false, handled: false, reason: 'invalid_signature' };
  }

  // Event allowlist — never let an arbitrary event mutate state.
  if (!WEBHOOK_EVENT_ALLOWLIST.has(verified.eventType)) {
    return { ok: true, handled: false, reason: 'ignored_event' };
  }

  // Idempotency: claim the event id; duplicates are no-ops.
  const isFirst = await claimWebhookEvent(verified.eventId || `${verified.eventType}:${verified.providerPaymentId}`);
  if (!isFirst) {
    return { ok: true, handled: false, reason: 'duplicate' };
  }

  if (!verified.providerOrderId) {
    return { ok: true, handled: false, reason: 'no_order' };
  }
  const record = await getPaymentByProviderOrderId(verified.providerOrderId);
  if (!record) {
    logger.warn('webhook_unknown_order', {});
    return { ok: true, handled: false, reason: 'unknown_order' };
  }
  const order = await getOrderById(record.orderId);
  if (!order) return { ok: true, handled: false, reason: 'order_missing' };

  await applyVerifiedPayment(order, record, {
    providerPaymentId: verified.providerPaymentId ?? record.providerPaymentId ?? '',
    providerOrderId: verified.providerOrderId,
    amount: verified.amount ?? null,
    currency: verified.currency ?? null,
    status: verified.status ?? 'PENDING',
  });

  await recordAudit({
    action: 'order.update',
    actorUid: 'system',
    actorRole: 'system',
    resourceType: 'payment',
    resourceId: order.orderNumber,
    metadata: { event: 'webhook_processed', type: verified.eventType },
  });
  return { ok: true, handled: true };
}
