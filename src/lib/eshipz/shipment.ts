import 'server-only';

/**
 * eShipz shipment creation: POST /api/v1/create-shipments. Builds the request
 * from an internal Order + our warehouse/carrier config, and returns the AWB,
 * carrier, and label/tracking URLs. Request field names follow the docs' sample;
 * the response is parsed defensively (adjust probes once a real response is seen).
 */
import { AppError } from '@/lib/security/errors';
import { logger } from '@/lib/logger';
import type { Order } from '@/services/orders/order.types';
import { eshipzConfig, isEshipzShipmentConfigured } from './config';
import { eshipzRequest } from './client';

export interface ShipmentResult {
  awbNumber: string;
  carrierSlug: string;
  labelUrl: string | null;
  trackingUrl: string | null;
  raw: unknown;
}

function buildBody(order: Order, weightKg: number) {
  const cfg = eshipzConfig();
  const a = order.shippingAddress;
  const rupees = (paise: number) => Math.round(paise) / 100;

  // Prepaid only — never COD.
  const carrierFields = cfg.useRuleBased
    ? {} // eShipz auto-selects the carrier via Automation Rules
    : {
        slug: cfg.carrierSlug,
        description: cfg.carrierSlug,
        ...(cfg.vendorId ? { vendor_id: cfg.vendorId } : {}),
        ...(cfg.serviceType ? { service_type: cfg.serviceType } : {}),
      };

  return {
    billing: { paid_by: 'shipper' },
    ...carrierFields,
    purpose: 'commercial',
    order_source: 'manual',
    parcel_contents: order.items.map((i) => i.productTitleSnapshot).join(', ').slice(0, 200),
    is_document: false,
    charged_weight: { unit: 'KG', value: weightKg },
    customer_reference: order.orderNumber, // unique reference → dedupes retries
    is_cod: false,
    collect_on_delivery: { amount: 0, currency: 'INR' },
    shipment: {
      ship_from: {
        // Name left blank in config → fall back to the company as the contact.
        contact_name: cfg.shipFrom.contactName || cfg.shipFrom.companyName,
        company_name: cfg.shipFrom.companyName,
        street1: cfg.shipFrom.street1,
        street2: cfg.shipFrom.street2 || undefined,
        city: cfg.shipFrom.city,
        state: cfg.shipFrom.state,
        postal_code: cfg.shipFrom.postalCode,
        country: cfg.shipFrom.country,
        phone: cfg.shipFrom.phone,
        email: cfg.shipFrom.email || undefined,
        type: 'business',
      },
      ship_to: {
        contact_name: order.customerName,
        street1: a.addressLine1,
        street2: a.addressLine2 || undefined,
        city: a.city,
        state: a.state,
        postal_code: a.postalCode,
        country: a.country || 'IN',
        phone: order.customerPhone,
        email: order.customerEmail || undefined,
        type: 'residential',
      },
      parcels: [
        {
          description: 'Order ' + order.orderNumber,
          weight: { unit: 'KG', value: weightKg },
          items: order.items.map((it) => ({
            description: it.productTitleSnapshot,
            quantity: it.quantity,
            price: { amount: rupees(it.unitPrice), currency: 'INR' },
            sku: it.sku,
          })),
        },
      ],
    },
  };
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v) return v;
  }
  return null;
}

function parse(json: unknown): Omit<ShipmentResult, 'raw'> {
  const root = (json && typeof json === 'object' ? (json as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  // Unwrap common containers: {data:{...}} or {shipments:[{...}]}.
  let d: Record<string, unknown> = root;
  if (root.data && typeof root.data === 'object') d = root.data as Record<string, unknown>;
  const arr = [d.shipments, d.results, root.shipments].find((x) => Array.isArray(x)) as
    | Record<string, unknown>[]
    | undefined;
  if (arr && arr[0]) d = arr[0];

  const awb = pickStr(d, ['awb', 'awb_number', 'tracking_number', 'waybill', 'awbNo']);
  return {
    awbNumber: awb ?? '',
    // The carrier eShipz actually chose (rule-based) — stored for tracking.
    carrierSlug: pickStr(d, ['slug', 'carrier', 'carrier_id', 'courier', 'vendor']) ?? '',
    labelUrl: pickStr(d, ['label', 'label_url', 'labelUrl', 'shipping_label']),
    trackingUrl: pickStr(d, ['tracking_url', 'trackingUrl', 'track_url']),
  };
}

/**
 * Create a shipment for an order. eShipz auto-selects the carrier (rule-based)
 * and returns which one it chose. `weightKg` comes from the order's product
 * weights (computed by the caller).
 */
export async function createShipment(order: Order, weightKg: number): Promise<ShipmentResult> {
  if (!isEshipzShipmentConfigured()) {
    throw new AppError('internal_error', { internal: 'eShipz shipment is not fully configured' });
  }
  const cfg = eshipzConfig();
  const path = cfg.useRuleBased ? '/api/v1/create-shipments/rule-based' : '/api/v1/create-shipments';
  const { json } = await eshipzRequest(path, 'POST', buildBody(order, weightKg), 'create-shipment');
  const parsed = parse(json);
  if (!parsed.awbNumber) {
    logger.error('eshipz_shipment_no_awb', { order: order.orderNumber });
    throw new AppError('bad_request', { internal: 'eShipz returned no AWB for the shipment' });
  }
  logger.info('eshipz_shipment_created', { order: order.orderNumber, awb: parsed.awbNumber });
  return {
    ...parsed,
    carrierSlug: parsed.carrierSlug || cfg.carrierSlug || 'eshipz',
    raw: json,
  };
}
