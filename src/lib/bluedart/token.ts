import 'server-only';

/**
 * BlueDart JWT token manager.
 *
 * The BlueDart Authentication API mints a JWT valid for 24 hours; every other
 * API call carries that token in a header. We cache the token in-process and
 * refresh it before expiry, so we call the auth API at most ~once/day per
 * server instance. On a fresh instance the first call generates a token.
 *
 * Auth mechanism per the BRD/JWT doc: ClientID is sent to the token endpoint and
 * the API Secret is supplied as a header. The exact header/param names are
 * config-driven (confirm from Swagger).
 */
import { AppError } from '@/lib/security/errors';
import { logger } from '@/lib/logger';
import { bluedartConfig, isBluedartAuthConfigured } from './config';

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

let cache: CachedToken | null = null;

/** Refresh a little before the 24h expiry to avoid mid-flight expiration. */
const TOKEN_TTL_MS = 23 * 60 * 60 * 1000;
const SKEW_MS = 60 * 1000;

/** For tests / forced rotation. */
export function _clearBluedartTokenCache(): void {
  cache = null;
}

function extractToken(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const s = payload.trim().replace(/^"|"$/g, '');
    return s.length > 20 ? s : null;
  }
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    for (const k of ['JWTToken', 'TokenNumber', 'token', 'access_token', 'Token']) {
      const v = obj[k];
      if (typeof v === 'string' && v.length > 20) return v;
    }
  }
  return null;
}

export async function getBluedartToken(): Promise<string> {
  if (!isBluedartAuthConfigured()) {
    throw new AppError('internal_error', { internal: 'BlueDart auth is not configured' });
  }
  if (cache && cache.expiresAt > Date.now() + SKEW_MS) {
    return cache.token;
  }

  const cfg = bluedartConfig();
  const url = new URL(cfg.baseUrl + cfg.tokenPath);
  url.searchParams.set(cfg.clientIdParam, cfg.clientId);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        [cfg.secretHeader]: cfg.clientSecret,
      },
    });
  } catch (err) {
    logger.error('bluedart_token_network_error', { err: String(err) });
    throw new AppError('internal_error', { internal: 'BlueDart token request failed (network)' });
  }

  const text = await res.text();
  let payload: unknown = text;
  try {
    payload = JSON.parse(text);
  } catch {
    /* token may be returned as a raw string */
  }

  if (!res.ok) {
    logger.error('bluedart_token_error', { status: res.status });
    // 401 → invalid ClientID/Secret per the BRD (a server-side config issue).
    throw new AppError('internal_error', {
      internal: `BlueDart token generation failed (${res.status})${res.status === 401 ? ' — invalid ClientID/Secret' : ''}`,
    });
  }

  const token = extractToken(payload);
  if (!token) {
    throw new AppError('internal_error', { internal: 'BlueDart token response had no token' });
  }

  cache = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
  logger.info('bluedart_token_refreshed', {});
  return token;
}
