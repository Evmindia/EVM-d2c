import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/config/site';
import { safeListCategories, safeListActiveProductSlugs } from '@/services/catalog/catalog.read';
import { logger } from '@/lib/logger';

// Dynamic route generation so XML sitemap always queries live database at request time
// and never hangs or fails during static build exports in sandboxes or CI/CD pipelines.
export const dynamic = 'force-dynamic';

/**
 * World-class XML Sitemap built from configuration + catalog data layer.
 * Includes:
 * - High-priority core landing pages (Home, Products, About, HTML Sitemap)
 * - Category listing landing pages with query parameters
 * - Active individual product URLs with accurate lastModified timestamps
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: absoluteUrl('/products'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/about'), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/sitemap'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  try {
    const [categories, products] = await Promise.all([
      safeListCategories(),
      safeListActiveProductSlugs(),
    ]);

    if (categories.length > 0) {
      for (const c of categories) {
        entries.push({
          url: absoluteUrl(`/products?category=${encodeURIComponent(c.slug)}`),
          lastModified: now,
          changeFrequency: 'daily',
          priority: 0.85,
        });
      }
    } else {
      // Core fallback categories when database catalog is unseeded
      const fallbackCategories = ['power-banks', 'headphones', 'earphones'];
      for (const cat of fallbackCategories) {
        entries.push({
          url: absoluteUrl(`/products?category=${cat}`),
          lastModified: now,
          changeFrequency: 'daily',
          priority: 0.85,
        });
      }
    }

    for (const p of products) {
      entries.push({
        url: absoluteUrl(`/products/${p.slug}`),
        lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
  } catch (err) {
    logger.warn('sitemap_generation_partial_error', { err: String(err) });
  }

  return entries;
}

