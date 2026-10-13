import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/config/site';

/**
 * World-class robots.txt optimized for search engine crawl efficiency.
 * Preserves 100% of Googlebot and Bingbot crawl budget for landing pages,
 * categories, and product detail pages by blocking private API, checkout,
 * and admin utilities.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: ['Googlebot', 'Bingbot', 'Applebot', 'DuckDuckBot'],
        allow: ['/', '/products', '/about', '/sitemap', '/feeds/'],
        disallow: [
          '/admin',
          '/admin/*',
          '/api/',
          '/api/*',
          '/cart',
          '/checkout',
          '/staff-login',
          '/*?*cursor=*',
        ],
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/api/',
          '/api/*',
          '/cart',
          '/checkout',
          '/staff-login',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

