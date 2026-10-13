import 'server-only';

/**
 * Checkout service — server-authoritative preview.
 *
 * Resolves the cart server-side, re-reads all products (batched, no N+1),
 * validates availability, and asks the server-controlled tax / shipping / coupon
 * services for their contributions. It NEVER accepts a client cart total or any
 * monetary value. Returns a CheckoutSummary; it does NOT create an order.
 */
import { getCartItems, type CartIdentity } from '@/services/cart/cart.service';
import { getProductsByIds } from '@/services/catalog/product.service';
import { quoteTax } from '@/services/tax/tax.service';
import { getShippingQuote } from '@/services/shipping/shipping.service';
import { resolveDiscount } from '@/services/coupon/coupon.service';
import { calculateSummary } from './checkout.calculator';
import type { CheckoutInput, CheckoutSummary } from './checkout.types';

/** Stable per-identity key for coupon usage limits (no raw secrets). */
function usageKeyFor(identity: CartIdentity): string {
  return identity.kind === 'user' ? `u:${identity.uid}` : 'guest';
}

/**
 * Compute the authoritative checkout summary for an identity + input.
 * Used by both /checkout/preview and order creation (which recomputes
 * independently — the preview result is never trusted for order creation).
 */
export async function previewCheckout(
  identity: CartIdentity,
  input: CheckoutInput,
): Promise<CheckoutSummary> {
  const items = await getCartItems(identity);
  const products = await getProductsByIds(items.map((i) => i.productId));

  // Authoritative subtotal from catalog (for discount/tax context).
  let subtotal = 0;
  for (const item of items) {
    const p = products.get(item.productId);
    if (p && p.isActive && typeof p.price === 'number') subtotal += p.price * item.quantity;
  }

  const discount = await resolveDiscount(input.couponCode, {
    subtotal,
    productIds: items.map((i) => i.productId),
    usageKey: usageKeyFor(identity),
  });

  const tax = await quoteTax({
    subtotal,
    destinationState: input.shippingAddress.state,
    lines: items.map((i) => {
      const p = products.get(i.productId);
      // Tax authority is the product's server-side hsn + gstRate (never client).
      return {
        productId: i.productId,
        hsn: p?.hsn ?? null,
        gstRate: typeof p?.gstRate === 'number' ? p.gstRate : null,
        quantity: i.quantity,
        lineSubtotal: p && typeof p.price === 'number' ? p.price * i.quantity : 0,
      };
    }),
  });

  const shipping = await getShippingQuote({
    destinationPostalCode: input.shippingAddress.postalCode,
    destinationState: input.shippingAddress.state,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
  });

  return calculateSummary({
    items,
    products,
    discount: { code: discount.code, amount: discount.amount },
    tax,
    shipping,
  });
}
