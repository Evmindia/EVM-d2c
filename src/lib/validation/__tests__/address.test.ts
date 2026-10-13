import { describe, it, expect } from 'vitest';
import { addressCreateSchema, addressUpdateSchema } from '@/lib/validation/address';

const valid = {
  fullName: 'Asha Rao',
  phone: '9876543210',
  addressLine1: '12 MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560001',
  country: 'IN',
};

describe('address create validation', () => {
  it('accepts a valid address (isDefault optional)', () => {
    const r = addressCreateSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.isDefault).toBeUndefined();
  });

  it('rejects an injected userId / id (strict) — no ownership reassignment', () => {
    expect(addressCreateSchema.safeParse({ ...valid, userId: 'victim' }).success).toBe(false);
    expect(addressCreateSchema.safeParse({ ...valid, id: 'x' }).success).toBe(false);
  });

  it('rejects invalid postal code', () => {
    expect(addressCreateSchema.safeParse({ ...valid, postalCode: '12' }).success).toBe(false);
  });

  it('rejects non-IN country', () => {
    expect(addressCreateSchema.safeParse({ ...valid, country: 'US' }).success).toBe(false);
  });
});

describe('address update validation', () => {
  it('requires at least one field', () => {
    expect(addressUpdateSchema.safeParse({}).success).toBe(false);
  });
  it('rejects userId reassignment', () => {
    expect(addressUpdateSchema.safeParse({ userId: 'victim' }).success).toBe(false);
  });
  it('accepts a partial update', () => {
    expect(addressUpdateSchema.safeParse({ city: 'Mumbai' }).success).toBe(true);
  });
});
