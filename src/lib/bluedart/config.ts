import 'server-only';

/**
 * BlueDart (APIGEE / DHL Drupal) integration config — SERVER ONLY.
 *
 * Everything is env-driven so no endpoint, credential, or account value is
 * hardcoded. Values marked "confirm from Swagger" are the few that the BRD does
 * not pin down (exact proxy paths, auth header names, date format) — set them
 * from the downloaded OpenAPI spec; no code change is needed.
 *
 * Sandbox works with the App's ClientID + Secret. Production additionally needs
 * the LoginID + LicenceKey obtained via manual verification at a BlueDart office.
 */

function env(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim();
}

export interface BluedartShipper {
  originArea: string;
  customerCode: string;
  name: string;
  address1: string;
  address2: string;
  address3: string;
  pincode: string;
  mobile: string;
  email: string;
}

export interface BluedartConfig {
  baseUrl: string;
  // Endpoint paths (APIGEE proxy) — confirm from Swagger.
  tokenPath: string;
  waybillPath: string;
  trackingPath: string;
  serviceabilityPath: string;
  // Auth header names — confirm from Swagger.
  secretHeader: string; // header carrying the API Secret when generating a token
  clientIdParam: string; // query/body param carrying the ClientID for token gen
  tokenHeader: string; // header carrying the JWT on subsequent calls
  // Credentials.
  clientId: string;
  clientSecret: string;
  loginId: string; // production
  licenceKey: string; // production
  // Shipment defaults.
  shipper: BluedartShipper;
  productCode: string;
  defaultWeightKg: number;
}

export function bluedartConfig(): BluedartConfig {
  return {
    baseUrl: env('BLUEDART_BASE_URL'),
    tokenPath: env('BLUEDART_TOKEN_PATH', '/in/transportation/token/v1/login'),
    waybillPath: env('BLUEDART_WAYBILL_PATH', '/in/transportation/waybill/v1/GenerateWayBill'),
    trackingPath: env('BLUEDART_TRACKING_PATH', '/in/transportation/tracking/v1/shipment'),
    serviceabilityPath: env(
      'BLUEDART_SERVICEABILITY_PATH',
      '/in/transportation/finder/v1/GetServicesforPincode',
    ),
    secretHeader: env('BLUEDART_SECRET_HEADER', 'ClientSecret'),
    clientIdParam: env('BLUEDART_CLIENTID_PARAM', 'ClientID'),
    tokenHeader: env('BLUEDART_TOKEN_HEADER', 'JWTToken'),
    clientId: env('BLUEDART_CLIENT_ID'),
    clientSecret: env('BLUEDART_CLIENT_SECRET'),
    loginId: env('BLUEDART_LOGIN_ID'),
    licenceKey: env('BLUEDART_LICENCE_KEY'),
    shipper: {
      originArea: env('BLUEDART_ORIGIN_AREA'),
      customerCode: env('BLUEDART_CUSTOMER_CODE'),
      name: env('BLUEDART_SHIPPER_NAME'),
      address1: env('BLUEDART_SHIPPER_ADDRESS1'),
      address2: env('BLUEDART_SHIPPER_ADDRESS2'),
      address3: env('BLUEDART_SHIPPER_ADDRESS3'),
      pincode: env('BLUEDART_SHIPPER_PINCODE'),
      mobile: env('BLUEDART_SHIPPER_MOBILE'),
      email: env('BLUEDART_SHIPPER_EMAIL'),
    },
    productCode: env('BLUEDART_PRODUCT_CODE', 'A'),
    defaultWeightKg: Number(env('BLUEDART_DEFAULT_WEIGHT_KG', '0.5')) || 0.5,
  };
}

/** True when the minimum needed to authenticate is present. */
export function isBluedartAuthConfigured(): boolean {
  const c = bluedartConfig();
  return Boolean(c.baseUrl && c.clientId && c.clientSecret);
}

/** True when auth + LoginID/LicenceKey are present (finder/tracking need these). */
export function isBluedartProfileConfigured(): boolean {
  const c = bluedartConfig();
  return Boolean(isBluedartAuthConfigured() && c.loginId && c.licenceKey);
}

/** True when everything needed to generate a waybill is present. */
export function isBluedartWaybillConfigured(): boolean {
  const c = bluedartConfig();
  return Boolean(
    isBluedartAuthConfigured() &&
      c.loginId &&
      c.licenceKey &&
      c.shipper.customerCode &&
      c.shipper.originArea &&
      c.shipper.pincode,
  );
}
