import 'server-only';

/**
 * eShipz tracking: POST /api/v2/trackings {q_num:<awb>, carrier_id}. Returns the
 * latest shipment status. Response parsed defensively (docs give the request but
 * not the response schema). Only non-PII status fields are surfaced.
 */
import { AppError } from '@/lib/security/errors';
import { eshipzConfig, isEshipzServiceConfigured } from './config';
import { eshipzRequest } from './client';

export interface TrackingResult {
  awbNumber: string;
  status: string | null;
  statusCode: string | null;
  statusDate: string | null;
  expectedDeliveryDate: string | null;
  delivered: boolean;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v) return v;
  }
  return null;
}

function parse(json: unknown, awb: string): TrackingResult {
  const root = (json && typeof json === 'object' ? (json as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  let d: Record<string, unknown> = root;
  if (root.data && typeof root.data === 'object') d = root.data as Record<string, unknown>;
  const arr = [d.trackings, d.results, root.trackings].find((x) => Array.isArray(x)) as
    | Record<string, unknown>[]
    | undefined;
  if (arr && arr[0]) d = arr[0];

  const status = pickStr(d, ['status', 'current_status', 'checkpoint_status', 'latest_status']);
  const statusCode = pickStr(d, ['status_code', 'tag', 'status_type']);
  return {
    awbNumber: awb,
    status,
    statusCode,
    statusDate: pickStr(d, ['status_date', 'checkpoint_time', 'updated_at']),
    expectedDeliveryDate: pickStr(d, ['edd', 'expected_delivery_date', 'estimated_delivery']),
    delivered:
      /delivered/i.test(status ?? '') || /^(DL|delivered)$/i.test(statusCode ?? ''),
  };
}

export async function trackShipment(awb: string, carrierId?: string): Promise<TrackingResult> {
  if (!isEshipzServiceConfigured()) {
    throw new AppError('not_implemented', { internal: 'eShipz tracking is not configured' });
  }
  const cfg = eshipzConfig();
  const { json } = await eshipzRequest(
    '/api/v2/trackings',
    'POST',
    { q_num: awb, carrier_id: carrierId || cfg.carrierSlug },
    'tracking',
  );
  return parse(json, awb);
}
