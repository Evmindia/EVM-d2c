import 'server-only';

/**
 * Cart repository — the ONLY module that touches Firestore for carts.
 *
 * Carts are SERVER-ONLY (Firestore rules deny all client access); every read /
 * write goes through the Admin SDK here. Document ids are derived server-side
 * and never exposed to clients:
 *   - user cart:  `u_<uid>`
 *   - guest cart: `g_<sha256(token)>`
 * Mutations run in Firestore transactions so concurrent add/update/remove/merge
 * operations cannot corrupt cart state.
 */
import type { DocumentReference, DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { AppError } from '@/lib/security/errors';
import { guestTokenHash } from '@/lib/cart/guest-cookie';
import {
  CART_MAX_DISTINCT_ITEMS,
  CART_MAX_QTY_PER_ITEM,
  type Cart,
  type CartItem,
} from './cart.types';

const COLLECTION = 'carts';

export function userCartRef(uid: string): DocumentReference {
  return adminDb().collection(COLLECTION).doc(`u_${uid}`);
}

export function guestCartRef(token: string): DocumentReference {
  return adminDb().collection(COLLECTION).doc(`g_${guestTokenHash(token)}`);
}

function parseCart(id: string, d: DocumentData): Cart {
  const rawItems: unknown = d.items;
  if (!Array.isArray(rawItems)) {
    return {
      id,
      ownerType: d.ownerType === 'user' ? 'user' : 'guest',
      ...(typeof d.userId === 'string' ? { userId: d.userId } : {}),
      items: [],
      createdAt: String(d.createdAt ?? ''),
      updatedAt: String(d.updatedAt ?? ''),
    };
  }

  const merged = new Map<string, CartItem>();
  for (const it of rawItems) {
    if (
      !it ||
      typeof it.productId !== 'string' ||
      typeof it.quantity !== 'number' ||
      !Number.isInteger(it.quantity) ||
      it.quantity <= 0
    ) {
      continue;
    }
    const variantId =
      typeof it.variantId === 'string' && it.variantId.trim() ? it.variantId.trim() : null;
    const key = `${it.productId}:::${variantId ?? ''}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity = Math.min(CART_MAX_QTY_PER_ITEM, existing.quantity + it.quantity);
    } else {
      merged.set(key, {
        productId: it.productId,
        variantId,
        quantity: Math.min(CART_MAX_QTY_PER_ITEM, it.quantity),
      });
    }
  }

  return {
    id,
    ownerType: d.ownerType === 'user' ? 'user' : 'guest',
    ...(typeof d.userId === 'string' ? { userId: d.userId } : {}),
    items: Array.from(merged.values()),
    createdAt: String(d.createdAt ?? ''),
    updatedAt: String(d.updatedAt ?? ''),
  };
}

/** Read a cart by ref, or null if it doesn't exist. */
export async function readCart(ref: DocumentReference): Promise<Cart | null> {
  const snap = await ref.get();
  if (!snap.exists) return null;
  return parseCart(snap.id, snap.data()!);
}

export interface CartOwnerMeta {
  ownerType: 'guest' | 'user';
  userId?: string;
}

/**
 * Transactionally mutate a cart. `mutate` receives the current items and returns
 * the next items. The distinct-item cap is enforced inside the transaction. The
 * document is created if it doesn't exist. Returns the resulting Cart.
 */
export async function mutateCart(
  ref: DocumentReference,
  meta: CartOwnerMeta,
  mutate: (current: CartItem[]) => CartItem[],
): Promise<Cart> {
  const db = adminDb();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? parseCart(snap.id, snap.data()!) : null;
    const base = existing?.items ?? [];
    const next = mutate(base);

    if (next.length > CART_MAX_DISTINCT_ITEMS) {
      throw new AppError('bad_request', {
        internal: `distinct item cap exceeded (${next.length} > ${CART_MAX_DISTINCT_ITEMS})`,
      });
    }

    const now = new Date().toISOString();
    const data = {
      ownerType: meta.ownerType,
      ...(meta.userId ? { userId: meta.userId } : {}),
      items: next,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    tx.set(ref, data);
    return { id: ref.id, ...data } as Cart;
  });
}

/** Delete a cart document (used after a successful merge). */
export async function deleteCart(ref: DocumentReference): Promise<void> {
  await ref.delete();
}
