import 'server-only';

/**
 * eShipz pincode serviceability: POST /api/v1/pincode-serviceability with
 * {origin_zip, destination_zip}. Origin is our warehouse pincode (config); the
 * destination is the customer's pincode. Response shape is parsed defensively
 * (the public docs give the request but not the response schema) — adjust the
 * field probes once a real response is observed.
 */
import { AppError } from '@/lib/security/errors';
import { eshipzConfig, isEshipzServiceConfigured } from './config';
import { eshipzRequest } from './client';

export interface ServiceabilityResult {
  pincode: string;
  serviceable: boolean;
  prepaidAvailable: boolean;
  codAvailable: boolean;
  areaCode: string | null;
}

const truthy = (v: unknown): boolean =>
  v === true || v === 1 || String(v ?? '').trim().toUpperCase() === 'Y' || String(v ?? '').toLowerCase() === 'true';

/**
 * eShipz response shape (confirmed live):
 *   { data: { prepaid_delivery, cod_delivery, is_mps_delivery, origin_zip,
 *             destination_zip }, remarks, status: "success" }
 */
function parse(json: unknown): Omit<ServiceabilityResult, 'pincode'> {
  const root = (json && typeof json === 'object' ? (json as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const data = (root.data && typeof root.data === 'object' ? root.data : root) as Record<string, unknown>;

  const prepaidAvailable = truthy(data.prepaid_delivery ?? data.prepaid);
  const codAvailable = truthy(data.cod_delivery ?? data.cod);
  // Prepaid-only store: serviceable strictly when PREPAID delivery is available
  // (a COD-only pincode is not deliverable for us).
  const serviceable = prepaidAvailable;

  return {
    serviceable,
    prepaidAvailable,
    codAvailable,
    areaCode: typeof data.area_code === 'string' ? data.area_code : null,
  };
}

export async function checkServiceability(destinationPincode: string): Promise<ServiceabilityResult> {
  if (!isEshipzServiceConfigured()) {
    throw new AppError('not_implemented', { internal: 'eShipz serviceability is not configured' });
  }
  const cfg = eshipzConfig();
  const { json } = await eshipzRequest(
    '/api/v1/pincode-serviceability',
    'POST',
    { origin_zip: cfg.shipFrom.postalCode, destination_zip: destinationPincode },
    'serviceability',
  );
  return { pincode: destinationPincode, ...parse(json) };
}
