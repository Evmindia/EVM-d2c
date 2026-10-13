/**
 * HTTP security headers + Content-Security-Policy.
 *
 * SPLIT DESIGN:
 *  - `staticSecurityHeaders()` returns every header that does NOT depend on the
 *    request (set once via next.config.ts, applied to all responses).
 *  - `contentSecurityPolicy(nonce)` builds the CSP string with a PER-REQUEST
 *    nonce. The CSP is set in the proxy (src/proxy.ts) so each HTML response
 *    carries a fresh nonce that Next.js App Router stamps onto its inline
 *    bootstrap/RSC hydration scripts. This lets us keep a strict `script-src`
 *    (no 'unsafe-inline') without breaking hydration.
 *
 * The CSP is explicit and DOCUMENTED (each origin justified below), not a
 * blanket policy, so it does not break required Firebase / payment / analytics
 * functionality. CDN/WAF-ready: an edge/WAF may add or override headers later.
 */
// Reliable dev/prod axis: Next sets NODE_ENV='development' under `next dev` and
// 'production' under `next build`/`next start`. Read directly (no `@` alias)
// because this module is imported by next.config.ts where aliases don't resolve.
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Documented CSP allowlist (finalized when analytics IDs are confirmed):
 *   Firebase Auth/Firestore/Storage : *.googleapis.com, *.firebaseio.com,
 *                                      identitytoolkit, securetoken, firestore
 *   Google Analytics 4              : googletagmanager.com, google-analytics.com
 *   Meta Pixel                      : connect.facebook.net, facebook.com
 *   Razorpay Checkout               : checkout.razorpay.com (+ api / lumberjack)
 */
const FIREBASE = [
  'https://*.googleapis.com',
  'https://*.firebaseio.com',
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://firestore.googleapis.com',
  'https://firebasestorage.googleapis.com',
];
const GA4 = ['https://www.googletagmanager.com', 'https://www.google-analytics.com'];
const META = ['https://connect.facebook.net', 'https://www.facebook.com'];
// Firebase Phone Auth uses Google reCAPTCHA (script + iframe) and completes the
// verification in an iframe hosted on the project's Firebase auth domain.
const RECAPTCHA_SCRIPT = ['https://www.google.com', 'https://www.gstatic.com', 'https://apis.google.com'];
const RECAPTCHA_CONNECT = ['https://www.google.com'];
const FIREBASE_AUTH_FRAME = ['https://www.google.com', 'https://*.firebaseapp.com'];
// Razorpay Checkout (pilot payment provider): the checkout script, its API, and
// the payment iframe. key_secret/webhook_secret are NEVER in the browser.
const RAZORPAY_SCRIPT = ['https://checkout.razorpay.com'];
const RAZORPAY_CONNECT = ['https://api.razorpay.com', 'https://lumberjack.razorpay.com'];
const RAZORPAY_FRAME = ['https://api.razorpay.com', 'https://checkout.razorpay.com'];
// Brand Reels external video embeds (Instagram Reels & YouTube Shorts/Videos)
const EMBED_FRAMES = [
  'https://www.instagram.com',
  'https://instagram.com',
  'https://www.youtube.com',
  'https://youtube.com',
  'https://www.youtube-nocookie.com',
];
// Media stream sources for brand videos & reels
const MEDIA_SOURCES = [
  "'self'",
  'blob:',
  'data:',
  'https://commondatastorage.googleapis.com',
  'https://firebasestorage.googleapis.com',
  'https://storage.googleapis.com',
  'https://*.firebasestorage.app',
  'https://*.fbcdn.net',
  'https://*.cdninstagram.com',
];

/**
 * Build the CSP string for a given per-request nonce.
 *
 * script-src: 'self' + the request NONCE (covers Next's inline hydration
 * scripts) + host allowlists for third-party scripts (Razorpay/GA4/Meta) +
 * 'unsafe-eval' in DEV ONLY (Turbopack HMR needs it; never in production). No
 * 'unsafe-inline' and no 'strict-dynamic' (so the documented host allowlists
 * keep working for external scripts).
 *
 * style-src keeps 'unsafe-inline' (Tailwind + Next inline critical CSS); style
 * injection is far lower risk than script injection, and this is unchanged.
 */
export function contentSecurityPolicy(nonce: string): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"], // clickjacking protection
    'form-action': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      ...(isProduction ? [] : ["'unsafe-eval'"]),
      ...GA4,
      ...META,
      ...RAZORPAY_SCRIPT,
      ...RECAPTCHA_SCRIPT,
    ],
    'connect-src': ["'self'", ...FIREBASE, ...GA4, ...META, ...RAZORPAY_CONNECT, ...RECAPTCHA_CONNECT],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://firebasestorage.googleapis.com',
      'https://storage.googleapis.com',
      'https://*.firebasestorage.app',
      ...GA4,
    ],
    'font-src': ["'self'", 'data:'],
    'frame-src': ["'self'", ...RAZORPAY_FRAME, ...FIREBASE_AUTH_FRAME, ...EMBED_FRAMES],
    'media-src': MEDIA_SOURCES,
    'worker-src': ["'self'", 'blob:'],
  };
  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
}

/**
 * All request-independent security headers (NO CSP — that is set per-request in
 * the proxy with a nonce). Applied globally via next.config.ts.
 */
export function staticSecurityHeaders(): { key: string; value: string }[] {
  const headers = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
  ];
  // HSTS only on built servers (avoid pinning HTTPS on localhost `next dev`).
  if (isProduction) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    });
  }
  return headers;
}
