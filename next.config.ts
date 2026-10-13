import type { NextConfig } from 'next';
import { staticSecurityHeaders } from './src/lib/security/http-headers';

/**
 * CDN/WAF-ready: no hardcoded domain. The app is origin-agnostic and can sit
 * behind any CDN/WAF later without code changes (WAF/CDN choice is PENDING).
 * Absolute URLs are derived from NEXT_PUBLIC_SITE_URL at runtime, never here.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // do not advertise the framework
  images: {
    formats: ['image/avif', 'image/webp'],
    // Product images are served from Firebase Storage (the image CDN host, not
    // the app's D2C domain — that remains PENDING and config-driven). Restrict
    // next/image to these known Google Storage hosts.
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: '**.firebasestorage.app' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      // DEV/TEST ONLY — allow Google-sourced placeholder images (e.g. Shopping
      // thumbnails, avatar photos) while seeding demo products. Production
      // product images must be uploaded to Firebase Storage; these hotlinked
      // hosts are ephemeral and should be removed before launch.
      { protocol: 'https', hostname: '**.gstatic.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },
  // Note: Next 16 removed `next lint` and the `eslint` config key. Linting runs
  // via the ESLint CLI (`npm run lint`) and in CI, decoupled from the build.
  async headers() {
    // Request-independent security headers only. The Content-Security-Policy is
    // set PER-REQUEST in src/proxy.ts so it can carry a fresh nonce (required for
    // Next.js App Router inline-script hydration under a strict script-src).
    return [
      {
        source: '/:path*',
        headers: staticSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
