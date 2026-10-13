import 'server-only';

/**
 * eShipz (multi-carrier shipping aggregator) config — SERVER ONLY.
 *
 * Auth is simple: POST /api/v2/login {email,password} → token; every other call
 * sends header `X-API-TOKEN: <token>`. Everything here is env-driven so no host,
 * credential, carrier, or warehouse value is hardcoded. When unset, the admin
 * fulfillment flow falls back to a clearly-marked PLACEHOLDER shipment.
 *
 * NOTE: some values need confirming with eShipz onboarding (exact base URL host,
 * carrier slug/vendor_id/service_type). They are all env-adjustable.
 */
function env(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim();
}

export interface EshipzShipFrom {
  contactName: string;
  companyName: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
}

export interface EshipzConfig {
  baseUrl: string;
  email: string;
  password: string;
  /** Optional partner key for the v1 login (X-API-KEY). v2 login needs none. */
  apiKey: string;
  useV2Login: boolean;
  /**
   * When true (default) eShipz auto-selects the carrier via its Automation Rules
   * (rule-based create-shipments). We never pin a courier — eShipz picks and
   * returns which one it used. Set ESHIPZ_USE_RULE_BASED=false + a carrier slug
   * only if you want to force a specific courier.
   */
  useRuleBased: boolean;
  carrierSlug: string; // optional; only used when useRuleBased is false
  vendorId: string; // optional
  serviceType: string; // optional
  // Origin (warehouse) — serviceability origin + shipment ship_from.
  shipFrom: EshipzShipFrom;
  /** Safety-net weight (kg) used only when a product has no weight set. */
  fallbackWeightKg: number;
}

export function eshipzConfig(): EshipzConfig {
  return {
    baseUrl: env('ESHIPZ_BASE_URL').replace(/\/+$/, ''),
    email: env('ESHIPZ_EMAIL'),
    password: env('ESHIPZ_PASSWORD'),
    apiKey: env('ESHIPZ_API_KEY'),
    useV2Login: env('ESHIPZ_USE_V2_LOGIN', 'true') !== 'false',
    useRuleBased: env('ESHIPZ_USE_RULE_BASED', 'true') !== 'false',
    carrierSlug: env('ESHIPZ_CARRIER_SLUG'),
    vendorId: env('ESHIPZ_VENDOR_ID'),
    serviceType: env('ESHIPZ_SERVICE_TYPE'),
    shipFrom: {
      contactName: env('ESHIPZ_SHIP_FROM_NAME'),
      companyName: env('ESHIPZ_SHIP_FROM_COMPANY'),
      street1: env('ESHIPZ_SHIP_FROM_STREET1'),
      street2: env('ESHIPZ_SHIP_FROM_STREET2'),
      city: env('ESHIPZ_SHIP_FROM_CITY'),
      state: env('ESHIPZ_SHIP_FROM_STATE'),
      postalCode: env('ESHIPZ_SHIP_FROM_PINCODE'),
      country: env('ESHIPZ_SHIP_FROM_COUNTRY', 'IN'),
      phone: env('ESHIPZ_SHIP_FROM_PHONE'),
      email: env('ESHIPZ_SHIP_FROM_EMAIL'),
    },
    fallbackWeightKg: Number(env('ESHIPZ_FALLBACK_WEIGHT_KG', '0.5')) || 0.5,
  };
}

/** True when we can authenticate: base URL + either an API key (used directly as
 * the token) or email+password (login flow). */
export function isEshipzAuthConfigured(): boolean {
  const c = eshipzConfig();
  return Boolean(c.baseUrl && (c.apiKey || (c.email && c.password)));
}

/** True when we can also check serviceability (need an origin pincode). */
export function isEshipzServiceConfigured(): boolean {
  return Boolean(isEshipzAuthConfigured() && eshipzConfig().shipFrom.postalCode);
}

/** True when everything needed to create a shipment is present. eShipz picks the
 * carrier (rule-based), so only the warehouse ship_from is required — no courier. */
export function isEshipzShipmentConfigured(): boolean {
  const c = eshipzConfig();
  return Boolean(
    isEshipzAuthConfigured() &&
      c.shipFrom.postalCode &&
      c.shipFrom.street1 &&
      (c.shipFrom.contactName || c.shipFrom.companyName) &&
      (c.useRuleBased || c.carrierSlug),
  );
}
