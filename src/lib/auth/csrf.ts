import 'server-only';

/**
 * CSRF defense for cookie-authenticated, state-changing endpoints.
 *
 * Our session cookie is SameSite=Lax, which already prevents cross-site fetch/XHR
 * from carrying the cookie. As defense-in-depth we also verify the request
 * Origin (falling back to Referer) matches the app's own host on mutating
 * requests. A cross-site browser attack always sends a mismatching Origin on a
 * cross-origin POST, so this blocks it; legitimate same-origin requests match,
 * and non-browser clients (which omit Origin and are not cookie/CSRF-exposed)
 * are unaffected.
 *
 * We do NOT rely on CORS for CSRF protection.
 */
import type { NextRequest } from 'next/server';
import { AppError } from '@/lib/security/errors';

function requestHost(req: NextRequest): string | null {
  return req.headers.get('x-forwarded-host') ?? req.headers.get('host');
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * Throw `forbidden` when a mutating request's Origin/Referer host does not match
 * the request host. When neither header is present (non-browser client), the
 * check passes — such clients are not subject to cookie-based CSRF.
 */
export function assertSameOrigin(req: NextRequest): void {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const sourceHost = hostOf(origin) ?? hostOf(referer);
  if (sourceHost === null) return; // no browser Origin/Referer -> not CSRF-exposed

  const host = requestHost(req);
  if (host && sourceHost === host) return;

  throw new AppError('forbidden', { internal: `cross-origin request blocked (${sourceHost})` });
}
