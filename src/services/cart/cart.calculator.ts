/**
 * Cart calculator — PURE and authoritative.
 *
 * Given stored cart items + freshly-read catalog products, it computes line
 * totals and the subtotal from CATALOG prices only. Client-supplied price /
 * subtotal / total are never inputs here, so they cannot influence the result.
 *
 * No taxes / shipping / discounts — those belong to checkout (later phase).
 */
import type { Product } from '@/types/catalog';
import type { CartItem, CartView, CartLine, CartOwnerType } from './cart.types';

/**
 * Build the authoritative cart view.
 * @param items   stored cart items (productId + quantity), already qty-validated
 * @param products map of productId -> internal Product (only existing ones)
 */
export function calculateView(
  items: CartItem[],
  products: Map<string, Product>,
  ownerType: CartOwnerType,
): CartView {
  const lines: CartLine[] = [];
  let subtotal = 0;
  let itemCount = 0;
  let hasUnavailable = false;

  for (const item of items) {
    const product = products.get(item.productId);

    // Missing or inactive product -> unavailable line (excluded from subtotal).
    if (!product || !product.isActive) {
      hasUnavailable = true;
      lines.push({
        productId: item.productId,
        variantId: item.variantId ?? null,
        variantLabel: null,
        variantType: null,
        variantValue: null,
        slug: product?.slug ?? '',
        title: product?.title ?? 'Unavailable product',
        thumbnailUrl: null,
        thumbnailAlt: '',
        unitPrice: null,
        quantity: item.quantity,
        lineTotal: null,
        stockStatus: product?.stockStatus ?? 'out_of_stock',
        available: false,
      });
      continue;
    }

    const variant = item.variantId && product.variants
      ? product.variants.find((v) => v.id === item.variantId)
      : undefined;

    const basePrice = typeof variant?.price === 'number' ? variant.price : product.price;
    const priced = typeof basePrice === 'number';
    const variantInStock = variant ? variant.inStock : true;
    const available = priced && product.stockStatus !== 'out_of_stock' && variantInStock;
    const unitPrice = priced ? basePrice! : null;
    const lineTotal = unitPrice !== null ? unitPrice * item.quantity : null;

    if (available && lineTotal !== null) {
      subtotal += lineTotal;
      itemCount += item.quantity;
    } else {
      hasUnavailable = true;
    }

    let thumb = product.thumbnail ?? product.images[0] ?? null;
    if (variant?.images && variant.images.length > 0) {
      thumb = variant.images[0] ?? thumb;
    } else if (variant?.label && product.images?.length) {
      const labelLower = variant.label.toLowerCase();
      const match = product.images.find(
        (img) =>
          img.alt.toLowerCase().includes(labelLower) ||
          img.url.toLowerCase().includes(labelLower),
      );
      if (match) {
        thumb = match;
      }
    }

    lines.push({
      productId: item.productId,
      variantId: item.variantId ?? null,
      variantLabel: variant?.label ?? null,
      variantType: variant?.type ?? null,
      variantValue: variant?.value ?? null,
      slug: product.slug,
      title: product.title,
      thumbnailUrl: thumb?.url ?? null,
      thumbnailAlt: thumb?.alt ?? (variant?.label ? `${product.title} - ${variant.label}` : product.title),
      unitPrice,
      quantity: item.quantity,
      lineTotal,
      stockStatus: !variantInStock ? 'out_of_stock' : product.stockStatus,
      available,
    });
  }

  return {
    ownerType,
    currency: 'INR',
    lines,
    subtotal,
    itemCount,
    distinctCount: items.length,
    hasUnavailable,
  };
}
