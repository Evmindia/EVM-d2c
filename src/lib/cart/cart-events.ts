'use client';

/**
 * Tiny client-side event bus so the header cart count can react to cart changes
 * without a global state library. The authoritative count always comes from a
 * server response; this only propagates that value across islands.
 */
export const CART_UPDATED_EVENT = 'evm:cart-updated';

export function notifyCartUpdated(itemCount: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: { itemCount } }));
}
