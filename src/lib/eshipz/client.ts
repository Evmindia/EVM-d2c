import 'server-only';

/**
 * Low-level eShipz request helper. Attaches the cached `X-API-TOKEN`, retries
 * once with a fresh token on 401, parses JSON defensively, and maps failures to
 * safe AppErrors (detail logged, never surfaced verbatim).
 */
import { AppError } from '@/lib/security/errors';
import { logger } from '@/lib/logger';
import { eshipzConfig } from './config';
import { getEshipzToken } from './token';

export interface EshipzResponse {
  status: number;
  json: unknown;
}

async function once(path: string, method: string, body: unknown, token: string): Promise<Response> {
  const cfg = eshipzConfig();
  return fetch(cfg.baseUrl + path, {
    method,
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'X-API-TOKEN': token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function eshipzRequest(
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
  op = 'request',
): Promise<EshipzResponse> {
  let token = await getEshipzToken();

  let res: Response;
  try {
    res = await once(path, method, body, token);
    if (res.status === 401) {
      // Token likely expired — re-login once and retry.
      token = await getEshipzToken(true);
      res = await once(path, method, body, token);
    }
  } catch (err) {
    logger.error('eshipz_network_error', { op, err: String(err) });
    throw new AppError('internal_error', { internal: `eShipz ${op} failed (network)` });
  }

  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* leave as text */
  }

  if (!res.ok) {
    logger.error('eshipz_http_error', { op, status: res.status });
    // 400 = business/validation error from the aggregator/carrier.
    throw new AppError(res.status === 400 ? 'bad_request' : 'internal_error', {
      internal: `eShipz ${op} HTTP ${res.status}`,
    });
  }

  return { status: res.status, json };
}
