import 'server-only';

/**
 * Product service — the ONLY place product reads/writes are performed.
 *
 * Security invariants:
 *  - Public reads return ACTIVE products only, mapped to the public DTO.
 *  - Writes are admin-only (enforced by the API layer) and go through here.
 *  - Query shapes are fixed and indexed — no client-controlled query building.
 *  - Pagination is always bounded (cursor-based), never unbounded.
 */
import type { Firestore, Query, DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { AppError } from '@/lib/security/errors';
import { toPublicProduct } from './catalog.mappers';
import { tokenize } from '@/lib/validation/catalog';
import type {
  Product,
  PublicProduct,
  ProductListResult,
  ProductSort,
} from '@/types/catalog';
import type { ProductCreateInput, ProductUpdateInput } from '@/lib/validation/catalog';

const COLLECTION = 'products';

function db(): Firestore {
  return adminDb();
}

/** Build a full Product from a Firestore document, applying safe defaults so a
 * partially-seeded document never throws. No business values are invented —
 * absent price/rating stay null/zero. */
function docToProduct(id: string, d: DocumentData): Product {
  return {
    id,
    slug: String(d.slug ?? ''),
    title: String(d.title ?? ''),
    shortDescription: String(d.shortDescription ?? ''),
    description: String(d.description ?? ''),
    brand: String(d.brand ?? ''),
    categoryId: String(d.categoryId ?? ''),
    sku: String(d.sku ?? ''),
    price: typeof d.price === 'number' ? d.price : null,
    mrp: typeof d.mrp === 'number' ? d.mrp : null,
    currency: 'INR',
    images: Array.isArray(d.images) ? d.images : [],
    thumbnail: d.thumbnail ?? null,
    specifications: Array.isArray(d.specifications) ? d.specifications : [],
    features: Array.isArray(d.features) ? d.features : [],
    whatsInTheBox: Array.isArray(d.whatsInTheBox) ? d.whatsInTheBox : [],
    warranty: d.warranty ?? null,
    storySections: Array.isArray(d.storySections) ? d.storySections : [],
    featureBlocks: Array.isArray(d.featureBlocks) ? d.featureBlocks : [],
    compatibility: Array.isArray(d.compatibility) ? d.compatibility : [],
    faqs: Array.isArray(d.faqs) ? d.faqs : [],
    variants: Array.isArray(d.variants) ? d.variants : [],
    stockStatus: d.stockStatus ?? 'out_of_stock',
    rating: {
      average: typeof d.rating?.average === 'number' ? d.rating.average : null,
      count: typeof d.rating?.count === 'number' ? d.rating.count : 0,
    },
    seo: d.seo ?? {},
    isActive: Boolean(d.isActive),
    searchTokens: Array.isArray(d.searchTokens) ? d.searchTokens : [],
    weightGrams: typeof d.weightGrams === 'number' ? d.weightGrams : null,
    hsn: d.hsn ?? null,
    gstRate: typeof d.gstRate === 'number' ? d.gstRate : null,
    cost: typeof d.cost === 'number' ? d.cost : null,
    supplier: d.supplier ?? null,
    internalNotes: d.internalNotes ?? null,
    createdAt: String(d.createdAt ?? ''),
    updatedAt: String(d.updatedAt ?? ''),
  };
}

// ---- Cursor helpers (opaque, bounded) --------------------------------------
interface Cursor {
  v: number | string;
  id: string;
}
function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}
function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if ((typeof parsed.v === 'number' || typeof parsed.v === 'string') && typeof parsed.id === 'string') {
      return parsed as Cursor;
    }
    return null;
  } catch {
    return null;
  }
}

function orderFieldFor(sort: ProductSort): { field: string; dir: 'asc' | 'desc' } {
  switch (sort) {
    case 'price_asc':
      return { field: 'price', dir: 'asc' };
    case 'price_desc':
      return { field: 'price', dir: 'desc' };
    case 'newest':
    default:
      return { field: 'createdAt', dir: 'desc' };
  }
}

function normalizeCategorySlugs(slug?: string): string[] {
  if (!slug) return [];
  const s = slug.toLowerCase().trim();
  if (['power-banks', 'powerbank', 'powerbanks', 'power-bank'].includes(s)) {
    return ['powerbank', 'power-banks'];
  }
  if (['headphones', 'headphone'].includes(s)) {
    return ['headphones', 'headphone'];
  }
  if (['earphones', 'earphone'].includes(s)) {
    return ['earphones', 'earphone'];
  }
  return [s];
}

// ---- Public reads (active-only) --------------------------------------------
export async function listPublicProducts(opts: {
  category?: string;
  sort: ProductSort;
  limit: number;
  cursor?: string;
}): Promise<ProductListResult> {
  const { field, dir } = orderFieldFor(opts.sort);
  let q: Query = db().collection(COLLECTION).where('isActive', '==', true);
  if (opts.category) {
    const matchingSlugs = normalizeCategorySlugs(opts.category);
    if (matchingSlugs.length === 1) {
      q = q.where('categorySlug', '==', matchingSlugs[0]);
    } else if (matchingSlugs.length > 1) {
      q = q.where('categorySlug', 'in', matchingSlugs);
    }
  }
  // Deterministic order with id tiebreak for stable cursoring.
  q = q.orderBy(field, dir).orderBy('__name__', dir);

  const cursor = decodeCursor(opts.cursor);
  if (cursor) q = q.startAfter(cursor.v, cursor.id);

  const snap = await q.limit(opts.limit + 1).get();
  const docs = snap.docs.slice(0, opts.limit);
  const items: PublicProduct[] = docs.map((doc) =>
    toPublicProduct(docToProduct(doc.id, doc.data())),
  );

  let nextCursor: string | null = null;
  if (snap.docs.length > opts.limit) {
    const last = docs[docs.length - 1]!;
    const value = last.get(field);
    nextCursor = encodeCursor({ v: value ?? '', id: last.id });
  }
  return { items, nextCursor };
}

/** Public single product by slug. Returns null if missing or inactive. */
export async function getPublicProductBySlug(slug: string): Promise<PublicProduct | null> {
  const snap = await db()
    .collection(COLLECTION)
    .where('slug', '==', slug)
    .where('isActive', '==', true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return toPublicProduct(docToProduct(doc.id, doc.data()));
}

/** Slugs of all active products, for sitemap generation. */
export async function listActiveProductSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  const snap = await db()
    .collection(COLLECTION)
    .where('isActive', '==', true)
    .select('slug', 'updatedAt')
    .limit(5000)
    .get();
  return snap.docs.map((d) => ({ slug: String(d.get('slug') ?? ''), updatedAt: String(d.get('updatedAt') ?? '') }));
}

// ---- Admin reads/writes -----------------------------------------------------
export async function adminListProducts(limit: number): Promise<Product[]> {
  const snap = await db()
    .collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(Math.min(limit, 100))
    .get();
  return snap.docs.map((d) => docToProduct(d.id, d.data()));
}

export async function adminGetProduct(id: string): Promise<Product | null> {
  const doc = await db().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return docToProduct(doc.id, doc.data()!);
}

/** Admin: count products via aggregation (no full scan). Optional filters. */
export async function adminCountProducts(
  filter?: { isActive?: boolean; stockStatus?: string },
): Promise<number> {
  let q: FirebaseFirestore.Query = db().collection(COLLECTION);
  if (filter?.isActive !== undefined) q = q.where('isActive', '==', filter.isActive);
  if (filter?.stockStatus) q = q.where('stockStatus', '==', filter.stockStatus);
  const agg = await q.count().get();
  return agg.data().count;
}

/** Admin: search products by exact SKU (allow-listed field). Bounded. */
export async function adminFindProductsBySku(sku: string, limit = 20): Promise<Product[]> {
  const snap = await db()
    .collection(COLLECTION)
    .where('sku', '==', sku)
    .limit(Math.min(limit, 50))
    .get();
  return snap.docs.map((d) => docToProduct(d.id, d.data()));
}

/**
 * Batch-read products by id (single getAll — avoids N+1). Returns a Map keyed
 * by id containing only documents that exist. Used by the cart calculator to
 * fetch authoritative product data for all lines at once.
 */
export async function getProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  const unique = Array.from(new Set(ids)).slice(0, 100);
  const map = new Map<string, Product>();
  if (unique.length === 0) return map;
  const refs = unique.map((id) => db().collection(COLLECTION).doc(id));
  const snaps = await db().getAll(...refs);
  for (const snap of snaps) {
    if (snap.exists) map.set(snap.id, docToProduct(snap.id, snap.data()!));
  }
  return map;
}

async function assertSlugUnique(slug: string, exceptId?: string): Promise<void> {
  const snap = await db().collection(COLLECTION).where('slug', '==', slug).limit(1).get();
  if (!snap.empty && snap.docs[0]!.id !== exceptId) {
    throw new AppError('conflict', { internal: `slug already exists: ${slug}` });
  }
}

/** Resolve a category slug for denormalized filtering; throws if missing. */
async function categorySlugForId(categoryId: string): Promise<string> {
  const doc = await db().collection('categories').doc(categoryId).get();
  if (!doc.exists) throw new AppError('bad_request', { internal: 'unknown categoryId' });
  return String(doc.get('slug') ?? '');
}

export async function createProduct(input: ProductCreateInput): Promise<Product> {
  await assertSlugUnique(input.slug);
  const categorySlug = await categorySlugForId(input.categoryId);
  const now = new Date().toISOString();
  const tokens = Array.from(
    new Set([
      ...tokenize(input.title),
      ...tokenize(input.sku),
      ...tokenize(input.brand),
      ...(input.keywords ?? []).flatMap((k) => tokenize(k)),
    ]),
  ).slice(0, 60);

  // `keywords` is consumed into searchTokens above; omit it from the stored doc.
  const { keywords: _keywords, ...rest } = input;
  const data = {
    ...rest,
    categorySlug,
    rating: input.rating ?? { average: null as number | null, count: 0 },
    searchTokens: tokens,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await db().collection(COLLECTION).add(data);
  return docToProduct(ref.id, data);
}

/** Describes a price/MRP change for audit purposes (server-computed). */
export interface PriceChange {
  changed: boolean;
  priceFrom: number | null;
  priceTo: number | null;
  mrpFrom: number | null;
  mrpTo: number | null;
  /** Server-computed discount percentages (never trusted from the client). */
  discountFrom: number | null;
  discountTo: number | null;
}

export interface UpdateProductResult {
  product: Product;
  priceChange: PriceChange;
}

/**
 * Update a product with OPTIMISTIC CONCURRENCY. If `expectedUpdatedAt` is
 * provided and no longer matches the current document, the write is rejected
 * with `conflict` (stale update) so a later admin's change is not clobbered.
 * The whole read-check-write runs in a Firestore transaction. Derived values
 * (discount %) are computed server-side for auditing — never trusted from input.
 */
export async function updateProduct(
  id: string,
  input: ProductUpdateInput,
  opts: { expectedUpdatedAt?: string } = {},
): Promise<UpdateProductResult> {
  if (input.slug) {
    const existingForSlug = await adminGetProduct(id);
    if (existingForSlug && input.slug !== existingForSlug.slug) {
      await assertSlugUnique(input.slug, id);
    }
  }
  const categorySlug = input.categoryId ? await categorySlugForId(input.categoryId) : undefined;

  const ref = db().collection(COLLECTION).doc(id);
  const now = new Date().toISOString();

  const { existing, updated } = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError('not_found');
    const current = docToProduct(snap.id, snap.data()!);

    // Optimistic concurrency: reject a stale write.
    if (opts.expectedUpdatedAt && current.updatedAt !== opts.expectedUpdatedAt) {
      throw new AppError('conflict', { internal: 'stale product update (updatedAt mismatch)' });
    }

    const patch: Record<string, unknown> = { ...input, updatedAt: now };
    delete patch.keywords;
    if (categorySlug !== undefined) patch.categorySlug = categorySlug;
    if (input.title || input.sku || input.brand || input.keywords) {
      patch.searchTokens = Array.from(
        new Set([
          ...tokenize(input.title ?? current.title),
          ...tokenize(input.sku ?? current.sku),
          ...tokenize(input.brand ?? current.brand),
          ...(input.keywords ?? []).flatMap((k) => tokenize(k)),
        ]),
      ).slice(0, 60);
    }
    tx.set(ref, patch, { merge: true });
    return { existing: current, updated: { ...current, ...(patch as Partial<Product>) } as Product };
  });

  const priceChange: PriceChange = {
    changed:
      (input.price !== undefined && input.price !== existing.price) ||
      (input.mrp !== undefined && input.mrp !== existing.mrp),
    priceFrom: existing.price,
    priceTo: updated.price,
    mrpFrom: existing.mrp,
    mrpTo: updated.mrp,
    discountFrom: discountPercent(existing.price, existing.mrp),
    discountTo: discountPercent(updated.price, updated.mrp),
  };

  return { product: updated, priceChange };
}

export async function setProductActive(id: string, isActive: boolean): Promise<void> {
  const existing = await adminGetProduct(id);
  if (!existing) throw new AppError('not_found');
  await db()
    .collection(COLLECTION)
    .doc(id)
    .set({ isActive, updatedAt: new Date().toISOString() }, { merge: true });
}

// ---- Pure helper (unit-tested) ---------------------------------------------
/** Discount percentage from price/mrp, or null when either is missing.
 * Never invents a discount. */
export function discountPercent(price: number | null, mrp: number | null): number | null {
  if (price === null || mrp === null || mrp <= 0 || price >= mrp) return null;
  return Math.round(((mrp - price) / mrp) * 100);
}
