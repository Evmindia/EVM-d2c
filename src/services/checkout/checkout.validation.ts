import 'server-only';

/**
 * Checkout business-level validation / normalization (beyond schema shape).
 *
 * Notably: the billing address is normalized SERVER-SIDE. We do not blindly
 * trust `billingAddressSameAsShipping` — when true we copy the shipping address
 * into billing; when false we require and use the provided billing address.
 */
import type { Address, CheckoutInput } from './checkout.types';

export function normalizeBillingAddress(input: CheckoutInput): Address {
  if (input.billingAddressSameAsShipping || !input.billingAddress) {
    return { ...input.shippingAddress };
  }
  return { ...input.billingAddress };
}
