import { publicEnv } from './env';

/**
 * Single source of truth for the site's base URL.
 *
 * PENDING — Final D2C subdomain (<FINAL_D2C_SUBDOMAIN>) is NOT decided yet.
 * The whole app derives absolute URLs (canonical, sitemap, robots, OG) from
 * NEXT_PUBLIC_SITE_URL. When EVM finalizes the subdomain, change only that env
 * var — no application logic changes. This also keeps the app CDN/WAF-ready:
 * the origin is configuration, never hardcoded.
 */

const FALLBACK_DEV_URL = 'http://localhost:3000';
const FALLBACK_HOSTED_URL = 'https://evm-storefront--evm-d2c-dev.asia-southeast1.hosted.app';

/** Absolute base URL, no trailing slash. Falls back to localhost in dev or hosted URL in prod. */
export function siteUrl(): string {
  const fallback = process.env.NODE_ENV === 'production' || process.env.K_SERVICE ? FALLBACK_HOSTED_URL : FALLBACK_DEV_URL;
  const raw = publicEnv.NEXT_PUBLIC_SITE_URL || fallback;
  return raw.replace(/\/+$/, '');
}

/** Build an absolute URL for a path, using the configured base URL. */
export function absoluteUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl()}${normalized}`;
}

/** True once a real (non-localhost) site URL has been configured. */
export function isSiteUrlConfigured(): boolean {
  const raw = publicEnv.NEXT_PUBLIC_SITE_URL;
  return Boolean(raw) && !raw.includes('localhost');
}

export const siteMeta = {
  name: 'EVM India',
  shortName: 'EVM Store',
  legalName: 'Hundia Infosolutions Pvt Ltd',
  description:
    'Official EVM India Store — Buy high-performance MagSafe power banks, hybrid ANC wireless headphones, Type-C earphones and fast GaN chargers. Doorstep pickup & drop warranty across 625+ Indian cities.',
  tagline: 'Everyday Tech, Elevated.',
  supportEmail: 'support@evmzone.com',
  supportPhone: '1800 102 0432',
  supportTollFree: '1800 102 0432',
  parentDomain: 'evmzone.com',
  social: {
    instagram: 'https://instagram.com/evmzone',
    facebook: 'https://facebook.com/evmzone',
    youtube: 'https://youtube.com/@evmzone',
    twitter: 'https://twitter.com/evmzone',
    linkedin: 'https://linkedin.com/company/evmzone',
  },
  keywords: [
    'EVM',
    'EVM India',
    'EVM power bank',
    'EVM headphones',
    'EVM earphones',
    'evmzone',
    'magsafe power bank india',
    'wireless power bank',
    '10000mah power bank',
    '20000mah fast charging power bank',
    'anc wireless headphones',
    'type c earphones',
    'best earphone with mic',
    'fast gan charger india',
    'made in india electronics',
    'evm pickup and drop warranty',
  ],
} as const;
