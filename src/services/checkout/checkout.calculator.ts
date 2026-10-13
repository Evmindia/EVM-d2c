/**
 * Checkout calculator — PURE and authoritative.
 *
 * Inputs: authoritative products + cart quantities + server-resolved discount /
 * tax / shipping. There is NO parameter for a client price/subtotal/tax/shipping/
 * total, so none can influence the result. A final total is produced ONLY when
 * tax and shipping are CONFIGURED and every line is available — otherwise total
 * is null and configurationComplete is false (no fabricated numbers).
 */
import type { Product } from '@/types/catalog';
import type { CartItem } from '@/services/cart/cart.types';
import type { TaxQuote } from '@/services/tax/tax.types';
import type { ShippingQuote } from '@/services/shipping/shipping.types';
import type { CheckoutItem, CheckoutSummary } from './checkout.types';

export interface CalculatorInput {
  items: CartItem[];
  products: Map<string, Product>;
  discount: { code: string | null; amount: number };
  tax: TaxQuote;
  shipping: ShippingQuote;
}

export function calculateSummary(input: CalculatorInput): CheckoutSummary {
  const lines: CheckoutItem[] = [];
  let subtotal = 0;
  let hasUnavailable = false;
  const issues: string[] = [];

  for (const item of input.items) {
    const product = input.products.get(item.productId);
    const variant = item.variantId && product?.variants
      ? product.variants.find((v) => v.id === item.variantId)
      : undefined;

    const basePrice = typeof variant?.price === 'number' ? variant.price : product?.price;
    const priced = typeof basePrice === 'number';
    const variantInStock = variant ? variant.inStock : true;
    const available =
      !!product && product.isActive && priced && product.stockStatus !== 'out_of_stock' && variantInStock;

    if (!available) {
      hasUnavailable = true;
      lines.push({
        productId: item.productId,
        variantId: item.variantId ?? null,
        variantLabel: variant?.label ?? null,
        sku: variant?.sku ?? product?.sku ?? '',
        title: product ? (variant?.label ? `${product.title} (${variant.label})` : product.title) : 'Unavailable product',
        unitPrice: priced ? basePrice! : 0,
        quantity: item.quantity,
        lineSubtotal: 0,
        available: false,
      });
      continue;
    }

    const unitPrice = basePrice!;
    const lineSubtotal = unitPrice * item.quantity;
    subtotal += lineSubtotal;
    lines.push({
      productId: item.productId,
      variantId: item.variantId ?? null,
      variantLabel: variant?.label ?? null,
      sku: variant?.sku ?? product!.sku,
      title: variant?.label ? `${product!.title} (${variant.label})` : product!.title,
      unitPrice,
      quantity: item.quantity,
      lineSubtotal,
      available: true,
    });
  }

  if (lines.length === 0) issues.push('Cart is empty.');
  if (hasUnavailable) issues.push('One or more items are unavailable.');

  const discount = Math.max(0, Math.min(input.discount.amount, subtotal));

  const taxConfigured = input.tax.status === 'CONFIGURED' && input.tax.amount !== null;
  const shippingConfigured = input.shipping.status === 'CONFIGURED' && input.shipping.amount !== null;
  if (!taxConfigured) issues.push('Tax configuration is pending.');
  if (!shippingConfigured) issues.push('Shipping is not configured (not added to the total).');

  // Approved total formula: subtotal + GST + shipping (ONLY when shipping is
  // configured). Tax is REQUIRED for a completable checkout; shipping is
  // optional and contributes only its configured amount (0 when unconfigured —
  // it is never fabricated as a fake rate).
  const configurationComplete = lines.length > 0 && !hasUnavailable && taxConfigured;

  const shippingAmount = shippingConfigured ? input.shipping.amount! : 0;
  const total = configurationComplete
    ? subtotal - discount + input.tax.amount! + shippingAmount
    : null;

  return {
    items: lines,
    subtotal,
    discount,
    couponCode: input.discount.code,
    tax: input.tax,
    shipping: input.shipping,
    total,
    currency: 'INR',
    configurationComplete,
    hasUnavailable,
    issues,
  };
}
