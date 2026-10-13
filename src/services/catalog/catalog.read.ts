import 'server-only';

/**
 * Safe read helpers for Server Components.
 *
 * The catalog is not seeded yet and Firebase Admin may be unconfigured in
 * dev/build. These wrappers NEVER throw and NEVER invent data — on any error
 * (unconfigured backend, empty collection) they return empty results so the UI
 * shows a clean empty state. Errors are logged server-side only.
 */
import { logger } from '@/lib/logger';
import {
  listPublicProducts,
  getPublicProductBySlug,
  listActiveProductSlugs,
} from './product.service';
import { listPublicCategories } from './category.service';
import { searchProducts } from './search.service';
import type {
  PublicProduct,
  PublicCategory,
  ProductListResult,
  ProductSort,
} from '@/types/catalog';

const DEFAULT_TIMEOUT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  let settled = false;

  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      settled = true;
      resolve(fallback);
    }, ms);
  });

  return Promise.race([
    promise
      .then((res) => {
        if (timer) clearTimeout(timer);
        return res;
      })
      .catch((err) => {
        if (timer) clearTimeout(timer);
        if (settled) return fallback;
        throw err;
      }),
    timeoutPromise,
  ]);
}

export async function safeListProducts(opts: {
  category?: string;
  sort: ProductSort;
  limit: number;
  cursor?: string;
}): Promise<ProductListResult> {
  try {
    return await withTimeout(
      listPublicProducts(opts),
      DEFAULT_TIMEOUT_MS,
      { items: [], nextCursor: null },
    );
  } catch (err) {
    logger.warn('catalog_list_unavailable', { err: String(err) });
    return { items: [], nextCursor: null };
  }
}

export async function safeGetProduct(slug: string): Promise<PublicProduct | null> {
  try {
    return await withTimeout(getPublicProductBySlug(slug), DEFAULT_TIMEOUT_MS, null);
  } catch (err) {
    logger.warn('catalog_get_unavailable', { err: String(err) });
    return null;
  }
}

export async function safeListCategories(): Promise<PublicCategory[]> {
  try {
    return await withTimeout(listPublicCategories(), DEFAULT_TIMEOUT_MS, []);
  } catch (err) {
    logger.warn('catalog_categories_unavailable', { err: String(err) });
    return [];
  }
}

export async function safeListActiveProductSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  try {
    return await withTimeout(listActiveProductSlugs(), DEFAULT_TIMEOUT_MS, []);
  } catch (err) {
    logger.warn('catalog_slugs_unavailable', { err: String(err) });
    return [];
  }
}

export async function safeSearch(query: string, limit: number): Promise<PublicProduct[]> {
  try {
    return await withTimeout(searchProducts(query, limit), DEFAULT_TIMEOUT_MS, []);
  } catch (err) {
    logger.warn('catalog_search_unavailable', { err: String(err) });
    return [];
  }
}

