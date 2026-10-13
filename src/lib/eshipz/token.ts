import 'server-only';

/**
 * eShipz auth token manager. Logs in once, caches the returned token in-process,
 * and reuses it as the `X-API-TOKEN` header on every call. The client re-logs in
 * automatically on a 401 (see client.ts), so we don't need to know the exact TTL.
 */
import { AppError } from '@/lib/security/errors';
import { logger } from '@/lib/logger';
import { eshipzConfig, isEshipzAuthConfigured } from './config';

let cachedToken: string | null = null;
let cachedAt = 0;
const SOFT_TTL_MS = 12 * 60 * 60 * 1000; // proactive refresh window

export function _clearEshipzToken(): void {
  cachedToken = null;
  cachedAt = 0;
}

function extractToken(payload: unknown): string | null {
  if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>;
    // eShipz login responses vary; probe common shapes.
    const candidates = [o.token, o.api_token, o.access_token, o.data];
    for (const c of candidates) {
      if (typeof c === 'string' && c.length > 10) return c;
      if (c && typeof c === 'object') {
        const inner = c as Record<string, unknown>;
        for (const k of ['token', 'api_token', 'access_token', 'x_api_token']) {
          if (typeof inner[k] === 'string' && (inner[k] as string).length > 10) {
            return inner[k] as string;
          }
        }
      }
    }
  }
  return null;
}

/** Get a valid token. When an API key is configured it IS the token (eShipz uses
 * the API key directly as X-API-TOKEN — no login round-trip). Otherwise we log in
 * with email/password (v2) and cache the returned token. `force` bypasses cache. */
export async function getEshipzToken(force = false): Promise<string> {
  if (!isEshipzAuthConfigured()) {
    throw new AppError('internal_error', { internal: 'eShipz auth is not configured' });
  }

  const cfg = eshipzConfig();

  // API key acts as the token directly.
  if (cfg.apiKey) return cfg.apiKey;

  if (!force && cachedToken && Date.now() - cachedAt < SOFT_TTL_MS) {
    return cachedToken;
  }

  const path = cfg.useV2Login ? '/api/v2/login' : '/api/v1/login';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (!cfg.useV2Login && cfg.apiKey) headers['X-API-KEY'] = cfg.apiKey;

  let res: Response;
  try {
    res = await fetch(cfg.baseUrl + path, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: cfg.email, password: cfg.password }),
    });
  } catch (err) {
    logger.error('eshipz_login_network_error', { err: String(err) });
    throw new AppError('internal_error', { internal: 'eShipz login failed (network)' });
  }

  const text = await res.text();
  let payload: unknown = text;
  try {
    payload = JSON.parse(text);
  } catch {
    /* leave as text */
  }
  if (!res.ok) {
    logger.error('eshipz_login_error', { status: res.status });
    throw new AppError('internal_error', { internal: `eShipz login failed (${res.status})` });
  }

  const token = extractToken(payload);
  if (!token) {
    throw new AppError('internal_error', { internal: 'eShipz login returned no token' });
  }
  cachedToken = token;
  cachedAt = Date.now();
  logger.info('eshipz_token_refreshed', {});
  return token;
}
