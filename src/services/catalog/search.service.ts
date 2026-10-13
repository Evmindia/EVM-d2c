import 'server-only';

/**
 * Catalog search service. Public entry point calls `searchProducts`, which uses
 * the configured SearchProvider. Query is tokenized + bounded server-side; only
 * fixed, indexed Firestore query shapes are built — no arbitrary query
 * injection is possible.
 */
import type { DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { toPublicProduct } from './catalog.mappers';
import { tokenize } from '@/lib/validation/catalog';
import type { SearchProvider } from './search-provider.interface';
import type { Product, PublicProduct } from '@/types/catalog';

/** Firestore token-matching provider (pilot default). */
class FirestoreSearchProvider implements SearchProvider {
  readonly id = 'firestore' as const;

  async search(query: string, limit: number): Promise<PublicProduct[]> {
    const tokens = tokenize(query).slice(0, 10);
    if (tokens.length === 0) return [];

    // `array-contains-any` matches products whose searchTokens include any of
    // the (validated, bounded) query tokens. Active-only, capped result set.
    const snap = await adminDb()
      .collection('products')
      .where('isActive', '==', true)
      .where('searchTokens', 'array-contains-any', tokens)
      .limit(Math.min(limit, 30))
      .get();

    // Rank by how many query tokens each product matches (simple relevance).
    const scored = snap.docs.map((d) => {
      const data = d.data() as DocumentData;
      const productTokens: string[] = Array.isArray(data.searchTokens) ? data.searchTokens : [];
      const score = tokens.reduce((acc, t) => acc + (productTokens.includes(t) ? 1 : 0), 0);
      return { doc: d, score };
    });
    scored.sort((a, b) => b.score - a.score);

    return scored.map(({ doc }) => {
      const data = doc.data() as DocumentData;
      const product = buildProduct(doc.id, data);
      return toPublicProduct(product);
    });
  }
}

// Minimal builder mirroring product.service defaults (kept local to avoid a
// public export of the internal shape).
function buildProduct(id: string, d: DocumentData): Product {
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
    stockStatus: d.stockStatus ?? 'out_of_stock',
    rating: {
      average: typeof d.rating?.average === 'number' ? d.rating.average : null,
      count: typeof d.rating?.count === 'number' ? d.rating.count : 0,
    },
    seo: d.seo ?? {},
    isActive: Boolean(d.isActive),
    searchTokens: Array.isArray(d.searchTokens) ? d.searchTokens : [],
    createdAt: String(d.createdAt ?? ''),
    updatedAt: String(d.updatedAt ?? ''),
  };
}

let provider: SearchProvider | null = null;
function getSearchProvider(): SearchProvider {
  // Only the Firestore provider exists today; selection point for future engines.
  if (!provider) provider = new FirestoreSearchProvider();
  return provider;
}

export async function searchProducts(query: string, limit: number): Promise<PublicProduct[]> {
  return getSearchProvider().search(query, limit);
}
