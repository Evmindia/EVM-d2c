import 'server-only';

/**
 * Payment repository — SERVER-ONLY. The `payments` and `processed_webhooks`
 * collections are denied to all clients by Firestore rules. Never stores card
 * data, CVV, secrets, or raw webhook payloads.
 */
import type { DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { AppError } from '@/lib/security/errors';
import {
  assertOrderTransition,
  assertPaymentTransition,
} from '@/services/orders/order.state-machine';
import type { OrderStatus } from '@/services/orders/order.types';
import type { PaymentRecord, PaymentProviderId, PaymentStatus } from './payment.types';

const PAYMENTS = 'payments';
const WEBHOOKS = 'processed_webhooks';
const ORDERS = 'orders';

function docToPayment(id: string, d: DocumentData): PaymentRecord {
  return { ...(d as Omit<PaymentRecord, 'paymentId'>), paymentId: id };
}

/** One payment record per internal order (doc id = pay_<orderId>). */
function paymentRef(orderId: string) {
  return adminDb().collection(PAYMENTS).doc(`pay_${orderId}`);
}

export async function getPaymentByOrderId(orderId: string): Promise<PaymentRecord | null> {
  const snap = await paymentRef(orderId).get();
  if (!snap.exists) return null;
  return docToPayment(snap.id, snap.data()!);
}

export async function getPaymentByProviderOrderId(
  providerOrderId: string,
): Promise<PaymentRecord | null> {
  const snap = await adminDb()
    .collection(PAYMENTS)
    .where('providerOrderId', '==', providerOrderId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return docToPayment(doc.id, doc.data());
}

/** Create or overwrite the payment record for an order. */
export async function upsertPayment(record: Omit<PaymentRecord, 'paymentId'>): Promise<PaymentRecord> {
  const ref = paymentRef(record.orderId);
  await ref.set(record, { merge: true });
  return docToPayment(ref.id, (await ref.get()).data()!);
}

export async function patchPayment(orderId: string, patch: Partial<PaymentRecord>): Promise<void> {
  await paymentRef(orderId).set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Atomically capture a payment AND mark its order PAID in a SINGLE Firestore
 * transaction, so the critical "paid" transition can never leave the system in
 * an inconsistent Order=PAID / Payment!=CAPTURED (or the reverse) state.
 *
 * Fully idempotent + self-reconciling:
 *  - If the order is already PAID, it does not re-transition; it reconciles the
 *    payment doc to CAPTURED if a transient boundary left it behind, and reports
 *    firstCapture=false so side effects (inventory hook, audit) do NOT re-fire.
 *  - Otherwise it asserts BOTH the order (…->PAID) and payment (…->CAPTURED)
 *    transitions in-transaction (rejecting e.g. CANCELLED->PAID, FAILED->CAPTURED)
 *    and writes both docs together.
 *
 * Returns firstCapture=true only when THIS call performed the capture.
 */
export async function captureAtomically(input: {
  orderId: string;
  providerPaymentId: string;
  provider: PaymentProviderId;
  providerOrderId: string | null;
}): Promise<{ firstCapture: boolean }> {
  const db = adminDb();
  const orderRef = db.collection(ORDERS).doc(input.orderId);
  const payRef = db.collection(PAYMENTS).doc(`pay_${input.orderId}`);

  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    const paySnap = await tx.get(payRef);
    if (!orderSnap.exists) throw new AppError('not_found');

    const orderStatus = String(orderSnap.get('orderStatus') ?? '') as OrderStatus;
    const payStatus = (paySnap.exists ? String(paySnap.get('status')) : 'PENDING') as PaymentStatus;
    const now = new Date().toISOString();

    const capturedPayment = {
      status: 'CAPTURED' as PaymentStatus,
      providerPaymentId: input.providerPaymentId,
      capturedAt: now,
      updatedAt: now,
    };

    // Already paid: reconcile the payment doc if a transient boundary left it
    // behind, but do not re-run the transition or side effects.
    if (orderStatus === 'PAID') {
      if (payStatus !== 'CAPTURED') tx.set(payRef, capturedPayment, { merge: true });
      return { firstCapture: false };
    }

    // Not yet paid: assert both transitions atomically.
    assertOrderTransition(orderStatus, 'PAID'); // e.g. CANCELLED->PAID rejected
    assertPaymentTransition(payStatus, 'CAPTURED'); // e.g. FAILED->CAPTURED rejected

    tx.set(
      orderRef,
      {
        orderStatus: 'PAID',
        payment: {
          status: 'CAPTURED',
          provider: input.provider,
          providerOrderId: input.providerOrderId,
          providerPaymentId: input.providerPaymentId,
        },
        updatedAt: now,
      },
      { merge: true },
    );
    tx.set(payRef, capturedPayment, { merge: true });
    return { firstCapture: true };
  });
}

/**
 * Idempotency guard for webhook events. Returns true if this is the FIRST time
 * the event id is seen (and records it); false if already processed. Uses a
 * transaction so concurrent duplicate deliveries are handled safely.
 */
export async function claimWebhookEvent(eventId: string): Promise<boolean> {
  const ref = adminDb().collection(WEBHOOKS).doc(encodeURIComponent(eventId));
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return false;
    tx.set(ref, { processedAt: new Date().toISOString() });
    return true;
  });
}
