import 'server-only';

/**
 * Cart service — orchestrates cart operations with server authority.
 *
 * Identity is resolved by the API from a VERIFIED principal (authenticated) or a
 * secure guest token (cookie). This service never accepts userId from a request
 * body. Product data is always re-read from the catalog; client price/subtotal
 * are ignored entirely.
 */
import type { DocumentReference } from 'firebase-admin/firestore';
import { AppError } from '@/lib/security/errors';
import { getProductsByIds } from '@/services/catalog/product.service';
import { calculateView } from './cart.calculator';
import {
  userCartRef,
  guestCartRef,
  readCart,
  mutateCart,
  deleteCart,
  type CartOwnerMeta,
} from './cart.repository';
import {
  CART_MIN_QTY,
  CART_MAX_QTY_PER_ITEM,
  EMPTY_CART_VIEW,
  type Cart,
  type CartItem,
  type CartView,
  type CartOwnerType,
} from './cart.types';

/** Identity for a cart operation — resolved server-side, never from the body. */
export type CartIdentity =
  | { kind: 'user'; uid: string }
  | { kind: 'guest'; token: string };

function refFor(identity: CartIdentity): DocumentReference {
  return identity.kind === 'user' ? userCartRef(identity.uid) : guestCartRef(identity.token);
}
function metaFor(identity: CartIdentity): CartOwnerMeta {
  return identity.kind === 'user'
    ? { ownerType: 'user', userId: identity.uid }
    : { ownerType: 'guest' };
}
function ownerType(identity: CartIdentity): CartOwnerType {
  return identity.kind === 'user' ? 'user' : 'guest';
}

function clampQty(q: number): number {
  return Math.min(CART_MAX_QTY_PER_ITEM, Math.max(CART_MIN_QTY, Math.trunc(q)));
}

/**
 * Validate that a product exists and is active before it can enter the cart.
 * Rejects nonexistent / inactive products (inactive-product injection guard).
 */
async function assertProductAddable(productId: string): Promise<void> {
  const products = await getProductsByIds([productId]);
  const product = products.get(productId);
  if (!product) throw new AppError('not_found', { internal: `product ${productId} not found` });
  if (!product.isActive) {
    throw new AppError('bad_request', { internal: `product ${productId} is inactive` });
  }
}

/** Compute the authoritative cart view from stored items + fresh catalog data. */
export async function buildCartView(cart: Cart | null, ot: CartOwnerType): Promise<CartView> {
  if (!cart || cart.items.length === 0) return EMPTY_CART_VIEW(ot);
  const products = await getProductsByIds(cart.items.map((i) => i.productId));
  return calculateView(cart.items, products, ot);
}

/** GET cart view for an identity (empty view when no cart exists). */
export async function getCartView(identity: CartIdentity): Promise<CartView> {
  const cart = await readCart(refFor(identity));
  return buildCartView(cart, ownerType(identity));
}

/**
 * Raw stored cart items for an identity (productId + quantity only). Used by
 * checkout to re-read authoritative product data itself. Returns [] if no cart.
 */
export async function getCartItems(identity: CartIdentity): Promise<CartItem[]> {
  const cart = await readCart(refFor(identity));
  return cart?.items ?? [];
}

/**
 * The checkout-facing entry point. Returns a server-authoritative representation
 * of the cart. Future checkout uses THIS instead of trusting the browser.
 */
export async function calculateCart(identity: CartIdentity): Promise<CartView> {
  return getCartView(identity);
}

function isSameItem(item: CartItem, productId: string, variantId?: string | null): boolean {
  return item.productId === productId && (item.variantId ?? null) === (variantId ?? null);
}

function itemKey(item: CartItem): string {
  return `${item.productId}:::${item.variantId ?? ''}`;
}

/** Add `quantity` of a product (merges with any existing line for the same variant, capped). */
export async function addItem(
  identity: CartIdentity,
  productId: string,
  quantity: number,
  variantId?: string | null,
): Promise<CartView> {
  await assertProductAddable(productId);
  const add = clampQty(quantity);
  const normalizedVariantId = variantId?.trim() ? variantId.trim() : null;
  const cart = await mutateCart(refFor(identity), metaFor(identity), (items) => {
    const idx = items.findIndex((i) => isSameItem(i, productId, normalizedVariantId));
    if (idx === -1) {
      return [...items, { productId, variantId: normalizedVariantId, quantity: add }];
    }
    const next = [...items];
    next[idx] = {
      ...next[idx]!,
      quantity: clampQty(next[idx]!.quantity + add),
    };
    return next;
  });
  return buildCartView(cart, ownerType(identity));
}

/** Set the absolute quantity of an existing line (idempotent). */
export async function updateItem(
  identity: CartIdentity,
  productId: string,
  quantity: number,
  variantId?: string | null,
): Promise<CartView> {
  const qty = clampQty(quantity);
  const normalizedVariantId = variantId?.trim() ? variantId.trim() : null;
  const cart = await mutateCart(refFor(identity), metaFor(identity), (items) => {
    const idx = items.findIndex((i) => isSameItem(i, productId, normalizedVariantId));
    if (idx === -1) {
      throw new AppError('not_found', {
        internal: `item ${productId} (${normalizedVariantId ?? 'default'}) not in cart`,
      });
    }
    const next = [...items];
    next[idx] = { ...next[idx]!, quantity: qty };
    return next;
  });
  return buildCartView(cart, ownerType(identity));
}

/** Remove a line from the cart. */
export async function removeItem(
  identity: CartIdentity,
  productId: string,
  variantId?: string | null,
): Promise<CartView> {
  const normalizedVariantId = variantId?.trim() ? variantId.trim() : null;
  const cart = await mutateCart(refFor(identity), metaFor(identity), (items) =>
    items.filter((i) => !isSameItem(i, productId, normalizedVariantId)),
  );
  return buildCartView(cart, ownerType(identity));
}

/** Empty the cart. */
export async function clearCart(identity: CartIdentity): Promise<CartView> {
  const cart = await mutateCart(refFor(identity), metaFor(identity), () => []);
  return buildCartView(cart, ownerType(identity));
}

/**
 * Merge a guest cart into the authenticated user's cart on login.
 *
 * Deterministic rule: for each product + variant, quantities are SUMMED and then
 * clamped to the per-item maximum (never producing an invalid quantity).
 * Distinct-item cap is enforced by the repository transaction. The guest cart
 * is deleted and its cookie should be cleared by the caller.
 */
export async function mergeGuestIntoUser(uid: string, guestToken: string): Promise<CartView> {
  const guestRef = guestCartRef(guestToken);
  const guest = await readCart(guestRef);
  const guestItems = guest?.items ?? [];

  const userIdentity: CartIdentity = { kind: 'user', uid };
  const cart = await mutateCart(
    userCartRef(uid),
    { ownerType: 'user', userId: uid },
    (userItems) => {
      const merged = new Map<string, CartItem>();
      for (const it of userItems) {
        merged.set(itemKey(it), {
          productId: it.productId,
          variantId: it.variantId ?? null,
          quantity: it.quantity,
        });
      }
      for (const it of guestItems) {
        const k = itemKey(it);
        const existing = merged.get(k);
        if (existing) {
          existing.quantity = clampQty(existing.quantity + it.quantity);
        } else {
          merged.set(k, {
            productId: it.productId,
            variantId: it.variantId ?? null,
            quantity: clampQty(it.quantity),
          });
        }
      }
      return Array.from(merged.values());
    },
  );

  // Best-effort cleanup of the merged guest cart.
  if (guest) await deleteCart(guestRef);

  return buildCartView(cart, ownerType(userIdentity));
}

// Re-export limits for API/schema convenience.
export { CART_MAX_QTY_PER_ITEM, CART_MIN_QTY };
export type { CartItem };
