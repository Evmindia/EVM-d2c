import 'server-only';

/**
 * BlueDart Location Finder — GetServicesforPincode. Returns whether Blue Dart
 * can deliver to a pincode and which service tiers (prepaid / COD) are available
 * inbound (i.e. delivery INTO that pincode). Used at checkout for serviceability.
 */
import { AppError } from '@/lib/security/errors';
import { logger } from '@/lib/logger';
import { bluedartConfig, isBluedartProfileConfigured } from './config';
import { getBluedartToken } from './token';

export interface ServiceabilityResult {
  pincode: string;
  /** Blue Dart can deliver into this pincode (any inbound service = Y). */
  serviceable: boolean;
  prepaidAvailable: boolean;
  codAvailable: boolean;
  areaCode: string | null;
  serviceCenterCode: string | null;
}

const yn = (v: unknown): boolean => String(v ?? '').trim().toUpperCase() === 'Y';

/** Unwrap the ServiceCenterDetailsReference from a (possibly wrapped) response. */
function reference(json: unknown): Record<string, unknown> {
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    if ('PinCode' in obj || 'AreaCode' in obj) return obj;
    const direct = obj.ServiceCenterDetailsReference;
    if (direct && typeof direct === 'object') return direct as Record<string, unknown>;
    for (const v of Object.values(obj)) {
      if (v && typeof v === 'object') {
        const inner = v as Record<string, unknown>;
        if ('ServiceCenterDetailsReference' in inner) {
          return inner.ServiceCenterDetailsReference as Record<string, unknown>;
        }
        if ('PinCode' in inner || 'AreaCode' in inner) return inner;
      }
    }
    return obj;
  }
  return {};
}

export async function checkServiceability(pincode: string): Promise<ServiceabilityResult> {
  if (!isBluedartProfileConfigured()) {
    throw new AppError('not_implemented', { internal: 'BlueDart finder is not configured' });
  }

  const cfg = bluedartConfig();
  const token = await getBluedartToken();
  const body = {
    pinCode: pincode,
    profile: { LoginID: cfg.loginId, LicenceKey: cfg.licenceKey, Api_type: 'S' },
  };

  let res: Response;
  try {
    res = await fetch(cfg.baseUrl + cfg.serviceabilityPath, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        [cfg.tokenHeader]: token,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    logger.error('bluedart_finder_network_error', { pincode, err: String(err) });
    throw new AppError('internal_error', { internal: 'BlueDart finder request failed (network)' });
  }

  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* leave as text */
  }
  if (!res.ok) {
    logger.error('bluedart_finder_http_error', { pincode, status: res.status });
    throw new AppError('internal_error', { internal: `BlueDart finder HTTP ${res.status}` });
  }

  const ref = reference(json);
  return {
    pincode,
    serviceable: yn(ref.DomesticPriorityInbound) || yn(ref.ApexInbound) || yn(ref.GroundInbound),
    prepaidAvailable: yn(ref.eTailPrePaidAirInbound) || yn(ref.eTailPrePaidGroundInbound),
    codAvailable: yn(ref.eTailCODAirInbound) || yn(ref.eTailCODGroundInbound),
    areaCode: typeof ref.AreaCode === 'string' ? ref.AreaCode : null,
    serviceCenterCode: typeof ref.ServiceCenterCode === 'string' ? ref.ServiceCenterCode : null,
  };
}
