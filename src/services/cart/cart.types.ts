/**
 * Cart domain types.
 *
 * SECURITY: the persisted cart stores ONLY productId + quantity. It never stores
 * authoritative price/title/availability. All display + totals are computed by
 * the calculator from freshly-read catalog data. Any UI-cached product info is
 * derived at read time and is explicitly non-authoritative.
 */
import type { Currency, StockStatus } from '@/types/catalog';

export type CartOwnerType = 'guest' | 'user';

/** A stored cart line — the only trusted client-influenced data. */
export interface CartItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

/** The persisted cart document (server-side). */
export interface Cart {
  id: string;
  ownerType: CartOwnerType;
  /** Present only for authenticated carts (derived from verified token). */
  userId?: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

/** A computed, authoritative cart line for display + checkout. */
export interface CartLine {
  productId: string;
  variantId?: string | null;
  variantLabel?: string | null;
  variantType?: string | null;
  variantValue?: string | null;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  thumbnailAlt: string;
  /** Authoritative unit price (paise) from the catalog; null if unpriced. */
  unitPrice: number | null;
  quantity: number;
  /** unitPrice * quantity, or null when unpriced. */
  lineTotal: number | null;
  stockStatus: StockStatus;
  /** False when the product is missing, inactive, or unpriced. */
  available: boolean;
}

/** The server-authoritative cart representation (also used by future checkout). */
export interface CartView {
  /** Non-secret indicator only; never the raw storage id/path. */
  ownerType: CartOwnerType;
  currency: Currency;
  lines: CartLine[];
  /** Sum of available, priced line totals (paise). Server-calculated only. */
  subtotal: number;
  /** Total quantity across available lines. */
  itemCount: number;
  /** Number of distinct products. */
  distinctCount: number;
  /** True if any line is unavailable (missing/inactive/unpriced). */
  hasUnavailable: boolean;
}

// ---- Limits (server-enforced) ----------------------------------------------
export const CART_MIN_QTY = 1;
export const CART_MAX_QTY_PER_ITEM = 10;
export const CART_MAX_DISTINCT_ITEMS = 50;

export const EMPTY_CART_VIEW = (ownerType: CartOwnerType): CartView => ({
  ownerType,
  currency: 'INR',
  lines: [],
  subtotal: 0,
  itemCount: 0,
  distinctCount: 0,
  hasUnavailable: false,
});
