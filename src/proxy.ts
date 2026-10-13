import { NextResponse, type NextRequest } from 'next/server';
import { contentSecurityPolicy } from '@/lib/security/http-headers';

/**
 * Proxy (Next 16; formerly "middleware"). Two jobs:
 *
 * 1) PER-REQUEST CSP with a nonce. A fresh nonce is generated for every request,
 *    forwarded on the REQUEST headers (Next.js App Router reads it and stamps it
 *    onto its inline bootstrap/RSC hydration scripts), and set on the RESPONSE
 *    Content-Security-Policy header. This lets us keep a strict `script-src`
 *    (no 'unsafe-inline') without breaking hydration. Request-independent
 *    security headers are still set globally by next.config.ts.
 *
 * 2) First-line gate for protected areas (DEFENSE IN DEPTH ONLY — every
 *    protected route handler STILL verifies the Firebase session + authorization
 *    server-side; the proxy cannot verify tokens without the Admin SDK):
 *      - /admin, /api/admin     -> require a credential; admins verified in-handler
 *      - /account, /api/account -> require a credential (customer)
 *    No credential: page requests redirect to "/login" (with ?next=),
 *    API requests return 401 JSON. Admin surfaces also get noindex.
 *
 * Origin-agnostic (no hardcoded domain) -> CDN/WAF and final-subdomain ready.
 */
const SESSION_COOKIE = '__session';

function generateNonce(): string {
  // Edge-runtime safe (Web Crypto + btoa). 128 bits of randomness, base64.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function hasCredential(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.toLowerCase().startsWith('bearer ');
  const session = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  return Boolean(bearer) || session;
}

export function proxy(req: NextRequest): NextResponse {
  const nonce = generateNonce();
  const csp = contentSecurityPolicy(nonce);

  // Forward the nonce + CSP on the REQUEST so Next applies the nonce to its
  // scripts (and components can read `x-nonce` via next/headers if needed).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const { pathname } = req.nextUrl;
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isAccount = pathname.startsWith('/account') || pathname.startsWith('/api/account');

  // Credential gate for protected areas.
  if ((isAdmin || isAccount) && !hasCredential(req)) {
    if (pathname.startsWith('/api/')) {
      const res = NextResponse.json(
        { ok: false, error: { code: 'unauthenticated', message: 'Authentication is required.' } },
        { status: 401 },
      );
      res.headers.set('Content-Security-Policy', csp);
      return res;
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    const res = NextResponse.redirect(url);
    res.headers.set('Content-Security-Policy', csp);
    return res;
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  if (isAdmin) res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

export const config = {
  // Run on ALL routes so every HTML response gets a nonce'd CSP, EXCEPT static
  // assets and image optimizer (no inline scripts there; keeps overhead off the
  // hot path). API routes are included so their JSON responses also carry the CSP.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
