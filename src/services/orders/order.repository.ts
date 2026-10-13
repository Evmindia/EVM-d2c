import 'server-only';

/**
 * Order repository — SERVER-ONLY Firestore access for orders.
 *
 * Orders are created transactionally together with an idempotency record so a
 * replayed/double-submitted request cannot create two orders. Firestore rules
 * deny all client access to `orders` and `idempotency_keys`.
 */
import { createHash } from 'node:crypto';
import type { DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { AppError } from '@/lib/security/errors';
import type { Order } from './order.types';

const ORDERS = 'orders';
const IDEMPOTENCY = 'idempotency_keys';

function docToOrder(id: string, d: DocumentData): Order {
  return { ...(d as Omit<Order, 'id'>), id };
}

/** Compute the server-controlled idempotency document id. */
export function idempotencyDocId(identityKey: string, idempotencyKey: string): string {
  return createHash('sha256').update(`${identityKey}:${idempotencyKey}`).digest('hex');
}

/** Hash of the semantic request (identity + payload) for conflict detection. */
export function requestFingerprint(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export interface CreateOrderResult {
  order: Order;
  /** True when this call created the order; false when it replayed an existing one. */
  created: boolean;
}

/**
 * Create an order atomically with an idempotency guard.
 *  - Same idempotency key + same request fingerprint  -> returns existing order.
 *  - Same idempotency key + different fingerprint      -> conflict error.
 *  - New idempotency key                               -> creates the order.
 */
export async function createOrderIdempotent(
  orderData: Omit<Order, 'id'>,
  idem: { docId: string; fingerprint: string },
): Promise<CreateOrderResult> {
  const db = adminDb();
  const orderRef = db.collection(ORDERS).doc(); // internal auto id
  const idemRef = db.collection(IDEMPOTENCY).doc(idem.docId);

  return db.runTransaction(async (tx) => {
    const idemSnap = await tx.get(idemRef);
    if (idemSnap.exists) {
      const rec = idemSnap.data() as { orderId: string; fingerprint: string };
      if (rec.fingerprint !== idem.fingerprint) {
        throw new AppError('conflict', { internal: 'idempotency key reused with different payload' });
      }
      const existing = await tx.get(db.collection(ORDERS).doc(rec.orderId));
      if (!existing.exists) {
        throw new AppError('internal_error', { internal: 'idempotency points to missing order' });
      }
      return { order: docToOrder(existing.id, existing.data()!), created: false };
    }

    tx.set(orderRef, orderData);
    tx.set(idemRef, {
      orderId: orderRef.id,
      fingerprint: idem.fingerprint,
      createdAt: orderData.createdAt,
    });
    return { order: { ...orderData, id: orderRef.id }, created: true };
  });
}

/** Fetch a single order by internal id. */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const snap = await adminDb().collection(ORDERS).doc(orderId).get();
  if (!snap.exists) return null;
  return docToOrder(snap.id, snap.data()!);
}

/** Patch an order document (server-only; used for state transitions). */
export async function patchOrder(orderId: string, patch: Partial<Order>): Promise<void> {
  await adminDb()
    .collection(ORDERS)
    .doc(orderId)
    .set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
}

/** Admin: list orders (most recent first), optionally filtered by status. Bounded. */
export async function adminListOrders(opts: {
  status?: string;
  limit: number;
}): Promise<Order[]> {
  let q: FirebaseFirestore.Query = adminDb().collection(ORDERS);
  if (opts.status) q = q.where('orderStatus', '==', opts.status);
  const snap = await q.orderBy('createdAt', 'desc').limit(Math.min(opts.limit, 100)).get();
  return snap.docs.map((d) => docToOrder(d.id, d.data()));
}

/** Admin: find orders by exact customer email (allow-listed search field). Bounded. */
export async function adminFindOrdersByEmail(email: string, limit = 20): Promise<Order[]> {
  const snap = await adminDb()
    .collection(ORDERS)
    .where('customerEmail', '==', email)
    .orderBy('createdAt', 'desc')
    .limit(Math.min(limit, 50))
    .get();
  return snap.docs.map((d) => docToOrder(d.id, d.data()));
}

/** Admin: count orders (optionally by status) via aggregation — no full scan. */
export async function adminCountOrders(status?: string): Promise<number> {
  let q: FirebaseFirestore.Query = adminDb().collection(ORDERS);
  if (status) q = q.where('orderStatus', '==', status);
  const agg = await q.count().get();
  return agg.data().count;
}

/** List a user's orders (most recent first). Server-side ownership by uid. */
export async function listOrdersByUser(uid: string, max = 50): Promise<Order[]> {
  const snap = await adminDb()
    .collection(ORDERS)
    .where('userId', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(Math.min(max, 100))
    .get();
  return snap.docs.map((d) => docToOrder(d.id, d.data()));
}

/** Look up an order by its customer-facing order number. */
export async function getByOrderNumber(orderNumber: string): Promise<Order | null> {
  const snap = await adminDb()
    .collection(ORDERS)
    .where('orderNumber', '==', orderNumber)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return docToOrder(doc.id, doc.data());
}
