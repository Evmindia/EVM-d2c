/**
 * Checkout domain types.
 *
 * The CheckoutSummary is the SERVER-AUTHORITATIVE representation of what an order
 * would cost. Every monetary value here is computed server-side from catalog
 * data + server-controlled providers. The browser never supplies any of these.
 */
import type { Currency } from '@/types/catalog';
import type { TaxQuote } from '@/services/tax/tax.types';
import type { ShippingQuote } from '@/services/shipping/shipping.types';

export interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
}

export interface Address {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/** Validated checkout input (customer + addresses + optional coupon). */
export interface CheckoutInput {
  customer: CustomerInfo;
  shippingAddress: Address;
  billingAddressSameAsShipping: boolean;
  billingAddress?: Address;
  couponCode?: string;
}

/** A snapshotted checkout line (values captured at calculation time). */
export interface CheckoutItem {
  productId: string;
  variantId?: string | null;
  variantLabel?: string | null;
  sku: string;
  title: string;
  unitPrice: number; // paise, from catalog
  quantity: number;
  lineSubtotal: number; // unitPrice * quantity
  available: boolean;
}

export interface CheckoutSummary {
  items: CheckoutItem[];
  subtotal: number; // paise
  discount: number; // paise (0 when none)
  couponCode: string | null;
  tax: TaxQuote;
  shipping: ShippingQuote;
  /** Final total in paise, or null when configuration is incomplete. */
  total: number | null;
  currency: Currency;
  /** True only when tax + shipping are configured and all items available. */
  configurationComplete: boolean;
  hasUnavailable: boolean;
  /** Human-safe reasons the checkout is not yet completable. */
  issues: string[];
}
