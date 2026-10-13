/**
 * Zod schemas for checkout input. Strict objects reject unexpected fields —
 * including any price/subtotal/discount/tax/shipping/total or userId a client
 * might try to inject. Free text uses safeText (control-char free). India is the
 * initial market; postal code is validated as a 6-digit Indian PIN.
 */
import { z } from 'zod';
import { safeText } from '@/lib/security/validate';

// Email: bounded + format. Phone: Indian mobile (10 digits, optional +91).
const emailSchema = z.string().trim().toLowerCase().min(3).max(254).email();
const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^(?:\+?91)?[6-9]\d{9}$/, 'invalid Indian phone number'),
  );

const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, 'invalid postal code');

export const customerSchema = z
  .object({
    fullName: safeText(120),
    email: emailSchema,
    phone: phoneSchema,
  })
  .strict();

export const addressSchema = z
  .object({
    fullName: safeText(120),
    phone: phoneSchema,
    addressLine1: safeText(200),
    addressLine2: safeText(200).optional(),
    landmark: safeText(120).optional(),
    city: safeText(80),
    state: safeText(80),
    postalCode: pincodeSchema,
    // India-only for the pilot; validated but configurable later.
    country: z.literal('IN'),
  })
  .strict();

export const checkoutInputSchema = z
  .object({
    customer: customerSchema,
    shippingAddress: addressSchema,
    billingAddressSameAsShipping: z.boolean().default(true),
    billingAddress: addressSchema.optional(),
    couponCode: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(32)
      .regex(/^[A-Z0-9_-]+$/, 'invalid coupon code')
      .optional(),
  })
  .strict()
  .refine((v) => v.billingAddressSameAsShipping || !!v.billingAddress, {
    message: 'billingAddress is required when not same as shipping',
    path: ['billingAddress'],
  });

export type CheckoutInputParsed = z.infer<typeof checkoutInputSchema>;
