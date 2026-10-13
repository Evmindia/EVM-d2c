/**
 * Zod schemas for catalog inputs. All object schemas are `.strict()` so unknown
 * keys are rejected (defense against field injection / mass assignment). Free
 * text uses `safeText` (rejects control chars). Sizes are bounded to prevent
 * oversized payloads. Prices are integers (paise) and never trusted from public
 * clients — these schemas validate ADMIN writes and query params only.
 */
import { z } from 'zod';
import { safeText, hasControlChars } from '@/lib/security/validate';

// ---- Primitives -------------------------------------------------------------
/** URL-safe slug: lowercase letters, digits, hyphens. */
export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'invalid slug');

/** Firestore document id: bounded, no slashes/control chars. */
export const docIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, 'invalid id');

const priceSchema = z.number().int().min(0).max(100_000_000).nullable();

const imageSchema = z
  .object({
    url: z.string().trim().min(1).max(1024),
    alt: safeText(200),
    width: z.number().int().positive().max(10000).optional(),
    height: z.number().int().positive().max(10000).optional(),
  })
  .strict();

const specGroupSchema = z
  .object({
    group: safeText(80),
    items: z
      .array(z.object({ label: safeText(120), value: safeText(500) }).strict())
      .max(50),
  })
  .strict();

const seoSchema = z
  .object({
    title: safeText(120).optional(),
    description: safeText(320).optional(),
    keywords: z.array(safeText(40)).max(25).optional(),
  })
  .strict();

const stockStatusSchema = z.enum(['in_stock', 'out_of_stock', 'preorder']);

const variantSchema = z
  .object({
    id: safeText(64),
    type: z.enum(['color', 'capacity', 'storage', 'style']),
    label: safeText(80),
    value: safeText(80),
    sku: z.string().trim().max(64).optional(),
    price: priceSchema.optional(),
    slug: slugSchema.optional(),
    inStock: z.boolean(),
    images: z.array(imageSchema).max(20).optional(),
  })
  .strict();

const storySectionSchema = z
  .object({
    heading: safeText(160),
    description: safeText(2000),
    image: imageSchema.nullable().optional(),
  })
  .strict();

const featureBlockSchema = z
  .object({
    title: safeText(160),
    description: safeText(1000),
    icon: safeText(80).nullable().optional(),
  })
  .strict();

const faqSchema = z
  .object({
    question: safeText(240),
    answer: safeText(2000),
  })
  .strict();

// ---- Product create/update (ADMIN) -----------------------------------------
export const productCreateSchema = z
  .object({
    slug: slugSchema,
    title: safeText(160),
    shortDescription: safeText(320),
    description: z
      .string()
      .trim()
      .min(1)
      .max(8000)
      .refine((v) => !hasControlChars(v.replace(/[\n\r\t]/g, '')), 'invalid characters'),
    brand: safeText(80),
    categoryId: docIdSchema,
    sku: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/, 'invalid sku'),
    price: priceSchema,
    mrp: priceSchema,
    currency: z.literal('INR'),
    images: z.array(imageSchema).max(12),
    thumbnail: imageSchema.nullable(),
    specifications: z.array(specGroupSchema).max(30),
    features: z.array(safeText(240)).max(50),
    whatsInTheBox: z.array(safeText(160)).max(50),
    warranty: safeText(200).nullable(),

    // Rich D2C extensions (optional)
    storySections: z.array(storySectionSchema).max(20).optional(),
    featureBlocks: z.array(featureBlockSchema).max(30).optional(),
    compatibility: z.array(safeText(120)).max(50).optional(),
    faqs: z.array(faqSchema).max(50).optional(),
    variants: z.array(variantSchema).max(30).optional(),

    stockStatus: stockStatusSchema,
    rating: z
      .object({
        average: z.number().min(1).max(5).nullable(),
        count: z.number().int().min(0).max(1_000_000),
      })
      .strict()
      .optional(),
    seo: seoSchema,
    keywords: z.array(safeText(40)).max(40).optional(),
    isActive: z.boolean(),
    // Internal-only (optional; never surfaced publicly). PENDING real values.
    weightGrams: z.number().int().min(0).max(1_000_000).nullable().optional(),
    hsn: z.string().trim().max(20).nullable().optional(),
    gstRate: z.number().min(0).max(1).nullable().optional(),
  })
  .strict()
  .refine((p) => p.mrp === null || p.price === null || p.price <= p.mrp, {
    message: 'price must be <= mrp',
    path: ['price'],
  });

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

/** Partial update; same field rules. At least one field required. */
export const productUpdateSchema = productCreateSchema
  .innerType()
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'no fields to update');

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const setActiveSchema = z.object({ isActive: z.boolean() }).strict();

// ---- Category create/update (ADMIN) ----------------------------------------
export const categoryCreateSchema = z
  .object({
    name: safeText(80),
    slug: slugSchema,
    description: safeText(600),
    image: imageSchema.nullable(),
    sortOrder: z.number().int().min(0).max(10000),
    isActive: z.boolean(),
    seo: seoSchema,
  })
  .strict();

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

// ---- Public listing / search queries ---------------------------------------
export const productListQuerySchema = z
  .object({
    category: slugSchema.optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
    limit: z.coerce.number().int().min(1).max(50).default(24),
    cursor: z.string().max(200).optional(),
  })
  .strict();

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

/** Search query: bounded length, safe charset; tokenized server-side. */
export const searchQuerySchema = z
  .object({
    q: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine((v) => !hasControlChars(v), 'invalid characters'),
    limit: z.coerce.number().int().min(1).max(30).default(20),
  })
  .strict();

export type SearchQuery = z.infer<typeof searchQuerySchema>;

/** Tokenize free text into lowercased search tokens (shared by service+seed). */
export function tokenize(input: string): string[] {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/[\s-]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 && t.length <= 40),
    ),
  ).slice(0, 40);
}
