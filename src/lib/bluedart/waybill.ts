import 'server-only';

/**
 * BlueDart GenerateWayBill client. Builds the request from an internal Order,
 * calls the APIGEE waybill endpoint with the cached JWT, and returns the AWB
 * number + label content.
 *
 * The request field NAMES follow the BRD. A few values need confirming against
 * the OpenAPI spec and are config-driven or clearly marked:
 *  - date format (`/Date(...)/`), ProductCode/ProductType, weight source,
 *    COD detection, and the exact response wrapper.
 */
import { AppError } from '@/lib/security/errors';
import { logger } from '@/lib/logger';
import type { Order } from '@/services/orders/order.types';
import { bluedartConfig, isBluedartWaybillConfigured } from './config';
import { getBluedartToken } from './token';
import type { GenerateWaybillBody, WayBillGenerationResponse } from './types';

export interface WaybillResult {
  awbNumber: string;
  /** Label content as returned (typically base64). Null when not present. */
  labelBase64: string | null;
  raw: unknown;
}

/** BlueDart .NET epoch date, e.g. "/Date(1699999999999+0530)/". Confirm via spec. */
function bdDate(d: Date): string {
  return `/Date(${d.getTime()}+0530)/`;
}

/** Trim + cap a string to a max length (BlueDart fields are length-bounded). */
function cap(v: string | undefined | null, max: number): string {
  return (v ?? '').toString().slice(0, max);
}

function buildBody(order: Order): GenerateWaybillBody {
  const cfg = bluedartConfig();
  const addr = order.shippingAddress;

  // Prepaid vs COD: we have no explicit COD flag yet, so default to Prepaid.
  // Wire a real COD flag here when the order model carries one.
  const isCod = false;
  const rupees = (paise: number) => Math.round(paise) / 100;

  return {
    Profile: {
      LoginID: cfg.loginId,
      LicenceKey: cfg.licenceKey,
      Api_type: 'S',
    },
    Request: {
      Shipper: {
        OriginArea: cfg.shipper.originArea,
        CustomerCode: cfg.shipper.customerCode,
        CustomerName: cap(cfg.shipper.name, 30),
        CustomerAddress1: cap(cfg.shipper.address1, 30),
        CustomerAddress2: cap(cfg.shipper.address2, 30) || undefined,
        CustomerAddress3: cap(cfg.shipper.address3, 30) || undefined,
        CustomerPincode: cfg.shipper.pincode,
        CustomerMobile: cfg.shipper.mobile || undefined,
        CustomerEmailID: cfg.shipper.email || undefined,
        IsToPayCustomer: false,
      },
      Consignee: {
        ConsigneeName: cap(order.customerName, 30),
        ConsigneeAddress1: cap(addr.addressLine1, 30),
        ConsigneeAddress2: cap(addr.addressLine2 || addr.city, 30) || undefined,
        ConsigneeAddress3: cap(addr.city, 30) || undefined,
        ConsigneePincode: addr.postalCode,
        ConsigneeMobile: cap(order.customerPhone, 15) || undefined,
        ConsigneeEmailID: cap(order.customerEmail, 30) || undefined,
      },
      Services: {
        ProductCode: cfg.productCode,
        ProductType: 0, // 0=Docs, 1=Dutiables — confirm per product master
        SubProductCode: isCod ? 'C' : 'P',
        PieceCount: 1,
        ActualWeight: cfg.defaultWeightKg,
        DeclaredValue: rupees(order.total),
        ...(isCod ? { CollectableAmount: rupees(order.total) } : {}),
        CreditReferenceNo: order.orderNumber, // unique — dedupes retries
        PickupDate: bdDate(new Date()),
        PickupTime: '1600',
        RegisterPickup: false,
        PrinterLabelSize: '4', // 4x6 thermal — adjust as needed
      },
    },
  };
}

function readResponse(json: unknown): WayBillGenerationResponse {
  // BlueDart sometimes wraps the payload (e.g. GenerateWayBillResult). Unwrap the
  // first object that carries AWBNo / IsError, else use the payload itself.
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    if ('AWBNo' in obj || 'IsError' in obj) return obj as WayBillGenerationResponse;
    for (const v of Object.values(obj)) {
      if (v && typeof v === 'object' && ('AWBNo' in v || 'IsError' in v)) {
        return v as WayBillGenerationResponse;
      }
    }
    return obj as WayBillGenerationResponse;
  }
  return {};
}

/**
 * Generate a waybill for an order. Throws an AppError on any failure (network,
 * auth, business error) — the caller must NOT mark the order shipped unless this
 * resolves. The detailed BlueDart reason is logged (not surfaced verbatim).
 */
export async function generateWaybill(order: Order): Promise<WaybillResult> {
  if (!isBluedartWaybillConfigured()) {
    throw new AppError('internal_error', { internal: 'BlueDart waybill is not fully configured' });
  }

  const cfg = bluedartConfig();
  const token = await getBluedartToken();
  const body = buildBody(order);

  let res: Response;
  try {
    res = await fetch(cfg.baseUrl + cfg.waybillPath, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        [cfg.tokenHeader]: token,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    logger.error('bluedart_waybill_network_error', { order: order.orderNumber, err: String(err) });
    throw new AppError('internal_error', { internal: 'BlueDart waybill request failed (network)' });
  }

  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* leave as text */
  }

  if (!res.ok) {
    logger.error('bluedart_waybill_http_error', { order: order.orderNumber, status: res.status });
    throw new AppError('internal_error', {
      internal: `BlueDart waybill HTTP ${res.status}`,
    });
  }

  const resp = readResponse(json);
  if (resp.IsError || !resp.AWBNo) {
    const reason = resp.Status?.map((s) => s.StatusInformation).filter(Boolean).join('; ');
    logger.error('bluedart_waybill_business_error', {
      order: order.orderNumber,
      reason: reason || 'unknown',
    });
    throw new AppError('bad_request', {
      internal: `BlueDart waybill error: ${reason || 'no AWB returned'}`,
    });
  }

  const label =
    typeof resp.AWBPrintContent === 'string'
      ? resp.AWBPrintContent
      : Array.isArray(resp.AWBPrintContent)
        ? Buffer.from(resp.AWBPrintContent).toString('base64')
        : null;

  logger.info('bluedart_waybill_created', { order: order.orderNumber, awb: resp.AWBNo });
  return { awbNumber: resp.AWBNo, labelBase64: label, raw: json };
}
