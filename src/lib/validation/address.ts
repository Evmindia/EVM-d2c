/**
 * Zod schemas for saved customer addresses. Reuses the checkout address shape
 * (India, strict, PII-safe). Strict objects reject any injected userId/id beyond
 * the allowed fields. `isDefault` is accepted as an intent flag but the server
 * owns the actual default bookkeeping and the address's userId.
 */
import { z } from 'zod';
import { addressSchema } from '@/lib/validation/checkout';

export const addressCreateSchema = addressSchema
  .extend({ isDefault: z.boolean().optional() })
  .strict();

export type AddressCreateInput = z.infer<typeof addressCreateSchema>;

export const addressUpdateSchema = addressSchema
  .extend({ isDefault: z.boolean().optional() })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'no fields to update');

export type AddressUpdateInput = z.infer<typeof addressUpdateSchema>;
