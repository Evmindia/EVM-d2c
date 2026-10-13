import 'server-only';

/**
 * BlueDart shipment tracking (handler=tnt, action=custawbquery). The backend
 * returns XML; we extract the top-level shipment status fields with light regex
 * (no XML dependency). PII in the raw feed (sender/consignee names) is NOT
 * returned — only status/date fields.
 */
import { AppError } from '@/lib/security/errors';
import { logger } from '@/lib/logger';
import { bluedartConfig, isBluedartProfileConfigured } from './config';
import { getBluedartToken } from './token';

export interface TrackingResult {
  awbNumber: string;
  status: string | null;
  statusType: string | null; // e.g. 'DL' for delivered
  statusDate: string | null;
  expectedDeliveryDate: string | null;
  delivered: boolean;
}

function pick(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i'));
  return m && m[1] ? m[1].trim() : null;
}

export async function trackShipment(awbNumber: string): Promise<TrackingResult> {
  if (!isBluedartProfileConfigured()) {
    throw new AppError('not_implemented', { internal: 'BlueDart tracking is not configured' });
  }

  const cfg = bluedartConfig();
  const token = await getBluedartToken();
  const url = new URL(cfg.baseUrl + cfg.trackingPath);
  url.searchParams.set('handler', 'tnt');
  url.searchParams.set('action', 'custawbquery');
  url.searchParams.set('loginid', cfg.loginId);
  url.searchParams.set('awb', 'awb');
  url.searchParams.set('numbers', awbNumber);
  url.searchParams.set('format', 'xml');
  url.searchParams.set('lickey', cfg.licenceKey);
  url.searchParams.set('verno', '1');
  url.searchParams.set('scan', '1');

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: { accept: 'application/xml', [cfg.tokenHeader]: token },
    });
  } catch (err) {
    logger.error('bluedart_tracking_network_error', { awb: awbNumber, err: String(err) });
    throw new AppError('internal_error', { internal: 'BlueDart tracking request failed (network)' });
  }

  const xml = await res.text();
  if (!res.ok) {
    logger.error('bluedart_tracking_http_error', { awb: awbNumber, status: res.status });
    throw new AppError('internal_error', { internal: `BlueDart tracking HTTP ${res.status}` });
  }

  const status = pick(xml, 'Status');
  const statusType = pick(xml, 'StatusType');
  return {
    awbNumber,
    status,
    statusType,
    statusDate: pick(xml, 'StatusDate'),
    expectedDeliveryDate: pick(xml, 'ExpectedDeliveryDate'),
    delivered: statusType?.toUpperCase() === 'DL' || /delivered/i.test(status ?? ''),
  };
}
