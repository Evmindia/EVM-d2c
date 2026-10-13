/**
 * Zod schemas for cart mutations. Strict objects (no unknown keys), bounded
 * quantities. Note: the client may send productId + quantity ONLY. Any price,
 * subtotal, total, or product metadata in the body is rejected by `.strict()`
 * and would be ignored regardless — the server re-reads authoritative data.
 */
import { z } from 'zod';
import { docIdSchema } from '@/lib/validation/catalog';
import { CART_MIN_QTY, CART_MAX_QTY_PER_ITEM } from '@/services/cart/cart.types';

const quantitySchema = z
  .number()
  .int()
  .min(CART_MIN_QTY, `quantity must be at least ${CART_MIN_QTY}`)
  .max(CART_MAX_QTY_PER_ITEM, `quantity must be at most ${CART_MAX_QTY_PER_ITEM}`);

/** POST /api/cart/items — add a quantity of a product. */
export const addItemSchema = z
  .object({
    productId: docIdSchema,
    variantId: z.string().trim().min(1).max(100).optional().nullable(),
    quantity: quantitySchema.default(1),
  })
  .strict();

export type AddItemInput = z.infer<typeof addItemSchema>;

/** PATCH /api/cart/items/[productId] — set absolute quantity (idempotent). */
export const updateItemSchema = z
  .object({
    quantity: quantitySchema,
    variantId: z.string().trim().min(1).max(100).optional().nullable(),
  })
  .strict();

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export { quantitySchema };
