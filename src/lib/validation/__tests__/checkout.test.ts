import { describe, it, expect } from 'vitest';
import { customerSchema, addressSchema, checkoutInputSchema } from '@/lib/validation/checkout';

const validCustomer = { fullName: 'Asha Rao', email: 'asha@example.com', phone: '9876543210' };
const validAddress = {
  fullName: 'Asha Rao',
  phone: '9876543210',
  addressLine1: '12 MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560001',
  country: 'IN',
};

describe('customer validation', () => {
  it('accepts valid customer info', () => {
    expect(customerSchema.safeParse(validCustomer).success).toBe(true);
  });
  it('rejects invalid email and phone', () => {
    expect(customerSchema.safeParse({ ...validCustomer, email: 'nope' }).success).toBe(false);
    expect(customerSchema.safeParse({ ...validCustomer, phone: '12345' }).success).toBe(false);
    expect(customerSchema.safeParse({ ...validCustomer, phone: '1234567890' }).success).toBe(false); // must start 6-9
  });
  it('accepts +91-prefixed phone', () => {
    expect(customerSchema.safeParse({ ...validCustomer, phone: '+919876543210' }).success).toBe(true);
  });
  it('rejects unknown fields (strict)', () => {
    expect(customerSchema.safeParse({ ...validCustomer, role: 'admin' }).success).toBe(false);
  });
});

describe('address validation', () => {
  it('accepts a valid Indian address', () => {
    expect(addressSchema.safeParse(validAddress).success).toBe(true);
  });
  it('rejects invalid postal codes', () => {
    expect(addressSchema.safeParse({ ...validAddress, postalCode: '12' }).success).toBe(false);
    expect(addressSchema.safeParse({ ...validAddress, postalCode: '012345' }).success).toBe(false); // leading 0
    expect(addressSchema.safeParse({ ...validAddress, postalCode: 'ABCDEF' }).success).toBe(false);
  });
  it('rejects non-IN country for the pilot', () => {
    expect(addressSchema.safeParse({ ...validAddress, country: 'US' }).success).toBe(false);
  });
});

describe('checkout input validation — rejects injected monetary/identity fields', () => {
  const base = {
    customer: validCustomer,
    shippingAddress: validAddress,
    billingAddressSameAsShipping: true,
  };

  it('accepts a valid checkout input', () => {
    expect(checkoutInputSchema.safeParse(base).success).toBe(true);
  });

  it('rejects price/subtotal/discount/tax/shipping/total in the body', () => {
    for (const bad of [
      { ...base, subtotal: 0 },
      { ...base, total: 1 },
      { ...base, tax: 0 },
      { ...base, shipping: 0 },
      { ...base, discount: 999 },
      { ...base, price: 1 },
    ]) {
      expect(checkoutInputSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('rejects userId / orderStatus / paymentStatus injection', () => {
    expect(checkoutInputSchema.safeParse({ ...base, userId: 'victim' }).success).toBe(false);
    expect(checkoutInputSchema.safeParse({ ...base, orderStatus: 'PAID' }).success).toBe(false);
    expect(checkoutInputSchema.safeParse({ ...base, paymentStatus: 'CAPTURED' }).success).toBe(false);
  });

  it('requires billingAddress when not same as shipping', () => {
    expect(
      checkoutInputSchema.safeParse({ ...base, billingAddressSameAsShipping: false }).success,
    ).toBe(false);
    expect(
      checkoutInputSchema.safeParse({
        ...base,
        billingAddressSameAsShipping: false,
        billingAddress: validAddress,
      }).success,
    ).toBe(true);
  });

  it('validates coupon code format when provided', () => {
    expect(checkoutInputSchema.safeParse({ ...base, couponCode: 'SAVE10' }).success).toBe(true);
    expect(checkoutInputSchema.safeParse({ ...base, couponCode: 'bad code!' }).success).toBe(false);
  });
});
