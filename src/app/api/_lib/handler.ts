import 'server-only';

/**
 * Shared API route wrapper.
 *
 * Centralizes: request-id generation, optional rate limiting, safe error
 * conversion (no stack traces / internals leaked), and structured logging.
 * Every route handler should run through `route()` so these guarantees are
 * applied uniformly.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { errorResponse, AppError } from '@/lib/security/errors';
import { enforceRateLimit, type RateLimitPolicy } from '@/lib/security/rate-limit/rate-limit.service';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { logger } from '@/lib/logger';

export interface RouteContext {
  req: NextRequest;
  requestId: string;
  /** Best-effort client identity key (IP-based) for rate limiting/logging. */
  clientKey: string;
}

interface RouteOptions {
  /** Apply a named rate-limit policy keyed by client IP. */
  rateLimit?: RateLimitPolicy;
  /**
   * Enforce a same-origin check (CSRF defense) before the handler runs. Use on
   * cookie-authenticated, state-changing endpoints (POST/PATCH/DELETE).
   */
  sameOrigin?: boolean;
}

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

/** Derive a best-effort client key from proxy headers (CDN/WAF-friendly). */
function clientKey(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export function route(
  handler: (ctx: RouteContext) => Promise<NextResponse>,
  options: RouteOptions = {},
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const id = requestId();
    const key = clientKey(req);
    try {
      if (options.sameOrigin) {
        assertSameOrigin(req);
      }
      if (options.rateLimit) {
        await enforceRateLimit(options.rateLimit, key);
      }
      return await handler({ req, requestId: id, clientKey: key });
    } catch (err) {
      const isApp = err instanceof AppError;
      logger.error('api_error', {
        requestId: id,
        code: isApp ? err.code : 'internal_error',
        internal: isApp ? err.internal : String(err),
        path: req.nextUrl.pathname,
      });
      return errorResponse(err, id);
    }
  };
}

/** Convenience for a successful JSON response with the standard envelope. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}
