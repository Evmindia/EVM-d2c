import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaymentProvider } from '../payment-provider.interface';
import type {
  CreatePaymentOrderInput,
  CreatePaymentOrderResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  WebhookVerifyResult,
  RefundInput,
  RefundResult,
  FetchedPayment,
  PaymentStatus,
} from '../payment.types';
import { serverEnv } from '@/lib/config/server-env';
import { siteUrl } from '@/lib/config/site';
import { AppError } from '@/lib/security/errors';
import { logger } from '@/lib/logger';

interface SmartGatewayCreds {
  apiKey: string;
  merchantId: string;
  responseKey: string;
  clientId: string;
  baseUrl: string;
}

function creds(): SmartGatewayCreds {
  const env = serverEnv();
  const apiKey = env.HDFC_SMARTGATEWAY_API_KEY || env.PAYMENT_KEY_SECRET;
  const merchantId = env.HDFC_SMARTGATEWAY_MERCHANT_ID || env.PAYMENT_KEY_ID;
  const responseKey = env.HDFC_SMARTGATEWAY_RESPONSE_KEY || env.PAYMENT_WEBHOOK_SECRET;
  const clientId = env.HDFC_SMARTGATEWAY_PAYMENT_PAGE_CLIENT_ID || 'hdfcmaster';
  const baseUrl = env.HDFC_SMARTGATEWAY_BASE_URL || 'https://smartgateway.hdfcuat.bank.in';

  if (!apiKey || !merchantId) {
    throw new AppError('configuration_pending', {
      internal: 'HDFC SmartGateway credentials not configured (API key or Merchant ID missing)',
    });
  }
  return { apiKey, merchantId, responseKey, clientId, baseUrl: baseUrl.replace(/\/+$/, '') };
}

function authHeader(apiKey: string): string {
  return 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64');
}

/** Map HDFC SmartGateway order/payment status string to our vendor-neutral PaymentStatus. */
export function mapSmartGatewayStatus(status: string | undefined): PaymentStatus {
  if (!status) return 'PENDING';
  const upper = status.toUpperCase();
  switch (upper) {
    case 'CHARGED':
    case 'ORDER_SUCCEEDED':
    case 'SUCCESS':
    case 'CAPTURED':
      return 'CAPTURED';
    case 'AUTHORIZED':
    case 'AUTHENTICATED':
      return 'AUTHORIZED';
    case 'FAILED':
    case 'AUTHORIZATION_FAILED':
    case 'AUTHENTICATION_FAILED':
    case 'JUSPAY_DECLINED':
    case 'ORDER_FAILED':
    case 'AUTO_REFUNDED':
      return 'FAILED';
    case 'REFUNDED':
    case 'CHARGED_REFUNDED':
      return 'REFUNDED';
    case 'NEW':
    case 'PENDING':
    case 'PENDING_VBV':
    default:
      return 'PENDING';
  }
}

/** Constant-time hex comparison. */
function safeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return timingSafeEqual(ab, bb);
}

export class SmartGatewayProvider implements PaymentProvider {
  readonly id = 'smartgateway' as const;

  publicKey(): string {
    return creds().clientId;
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult> {
    const config = creds();
    // Authoritative amount from server: integer paise converted to decimal INR rupees string
    const amountRupees = (input.amount.value / 100).toFixed(2);
    const returnUrl = `${siteUrl()}/api/payments/callback`;

    // Customer reference (unique per customer)
    const customerId = input.customerEmail
      ? Buffer.from(input.customerEmail).toString('hex').slice(0, 30)
      : `cust_${input.orderId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;

    // Order ID format required by HDFC SmartGateway:
    // 1. Less than 21 characters
    // 2. No special characters (pure alphanumeric)
    // 3. Non-sequential
    const sanitizedOrderId = input.orderId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);

    const payload = {
      order_id: sanitizedOrderId,
      amount: amountRupees,
      currency: input.amount.currency,
      customer_id: customerId,
      customer_email: input.customerEmail || 'customer@evmzone.com',
      payment_page_client_id: config.clientId,
      action: 'paymentPage',
      return_url: returnUrl,
    };

    logger.info('smartgateway_create_session_init', {
      orderId: input.orderId,
      amount: amountRupees,
    });

    const res = await fetch(`${config.baseUrl}/session`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(config.apiKey),
        'x-merchantid': config.merchantId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error('smartgateway_create_session_failed', {
        status: res.status,
        body: errText,
        orderId: input.orderId,
      });
      throw new AppError('internal_error', {
        internal: `smartgateway session creation failed with status ${res.status}: ${errText}`,
      });
    }

    interface SessionResponse {
      status?: string;
      id?: string;
      order_id: string;
      payment_links?: {
        web?: string;
        iframe?: string;
        mobile?: string;
      };
      sdk_payload?: Record<string, unknown>;
    }

    const json = (await res.json()) as SessionResponse;
    const paymentUrl = json.payment_links?.web || json.payment_links?.iframe || '';

    return {
      provider: 'smartgateway',
      providerOrderId: json.order_id,
      amount: input.amount,
      checkoutPayload: {
        paymentUrl,
        providerSessionId: json.id || '',
        orderId: json.order_id,
      },
    };
  }

  async fetchPayment(providerOrderId: string): Promise<FetchedPayment> {
    const config = creds();
    const res = await fetch(`${config.baseUrl}/orders/${encodeURIComponent(providerOrderId)}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader(config.apiKey),
        'x-merchantid': config.merchantId,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error('smartgateway_fetch_order_failed', {
        status: res.status,
        orderId: providerOrderId,
        text,
      });
      throw new AppError('internal_error', {
        internal: `smartgateway fetch order failed: ${res.status}`,
      });
    }

    interface OrderResponse {
      id?: string;
      order_id: string;
      status: string;
      amount: number | string;
      currency?: string;
      refunded?: boolean;
    }

    const orderData = (await res.json()) as OrderResponse;
    const mapped = mapSmartGatewayStatus(orderData.status);
    const amountPaise = Math.round(Number(orderData.amount) * 100);

    return {
      providerPaymentId: orderData.id || orderData.order_id,
      providerOrderId: orderData.order_id,
      amount: amountPaise,
      currency: (orderData.currency || 'INR') as 'INR',
      status: mapped,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const config = creds();
    // Authoritative Server-to-Server order status verification
    const fetched = await this.fetchPayment(input.providerOrderId);

    // If a signature and response key are provided, verify signature
    if (input.signature && config.responseKey) {
      try {
        const expectedHmac = createHmac('sha256', config.responseKey)
          .update(input.providerOrderId)
          .digest('hex');
        if (!safeHexEqual(input.signature.toLowerCase(), expectedHmac.toLowerCase())) {
          logger.warn('smartgateway_signature_mismatch', {
            orderId: input.providerOrderId,
          });
        }
      } catch (err) {
        logger.warn('smartgateway_signature_verification_error', { err: String(err) });
      }
    }

    const isVerified = fetched.status === 'CAPTURED';

    return {
      verified: isVerified,
      providerPaymentId: fetched.providerPaymentId,
      providerOrderId: fetched.providerOrderId,
      amount: fetched.amount,
      currency: fetched.currency,
      status: fetched.status,
    };
  }

  async verifyWebhook(
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<WebhookVerifyResult> {
    const config = creds();
    let bodyObj: Record<string, unknown>;

    try {
      bodyObj = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return {
        valid: false,
        eventId: '',
        eventType: '',
        status: 'FAILED',
      };
    }

    // Header signature verification if provided
    const signatureHeader =
      headers['x-signature'] || headers['x-juspay-signature'] || headers['signature'];
    if (signatureHeader && config.responseKey) {
      try {
        const expected = createHmac('sha256', config.responseKey).update(rawBody).digest('hex');
        if (!safeHexEqual(signatureHeader.toLowerCase(), expected.toLowerCase())) {
          logger.warn('smartgateway_webhook_signature_invalid', {});
          return {
            valid: false,
            eventId: '',
            eventType: '',
            status: 'FAILED',
          };
        }
      } catch {
        // Continue if verification fails
      }
    }

    // Extract payload data (SmartGateway may nest inside content.order or at root)
    const content = (bodyObj.content as Record<string, unknown>) || {};
    const orderObj = (content.order as Record<string, unknown>) || (bodyObj.order as Record<string, unknown>) || bodyObj;

    const providerOrderId = (orderObj.order_id as string) || (bodyObj.order_id as string) || undefined;
    const providerPaymentId = (orderObj.id as string) || (bodyObj.id as string) || providerOrderId;
    const rawStatus = (orderObj.status as string) || (bodyObj.status as string) || '';
    const rawAmount = orderObj.amount ?? bodyObj.amount;
    const amountPaise = rawAmount !== undefined ? Math.round(Number(rawAmount) * 100) : null;
    const currency = ((orderObj.currency as string) || (bodyObj.currency as string) || 'INR');

    const mapped = mapSmartGatewayStatus(rawStatus);

    // Map vendor event name to standard internal events for allowlisting
    let eventType = 'payment.pending';
    if (mapped === 'CAPTURED') {
      eventType = 'payment.captured';
    } else if (mapped === 'AUTHORIZED') {
      eventType = 'payment.authorized';
    } else if (mapped === 'FAILED') {
      eventType = 'payment.failed';
    }

    const eventId =
      (bodyObj.id as string) ||
      (bodyObj.event_id as string) ||
      `${providerOrderId || 'evt'}:${rawStatus}:${Date.now()}`;

    return {
      valid: true,
      eventId,
      eventType,
      providerOrderId,
      providerPaymentId,
      amount: amountPaise,
      currency,
      status: mapped,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const config = creds();
    const amountRupees = (input.amount.value / 100).toFixed(2);

    const res = await fetch(`${config.baseUrl}/orders/${encodeURIComponent(input.providerPaymentId)}/refunds`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(config.apiKey),
        'x-merchantid': config.merchantId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        unique_request_id: input.idempotencyKey,
        amount: amountRupees,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      logger.error('smartgateway_refund_failed', { providerPaymentId: input.providerPaymentId, err });
      throw new AppError('internal_error', { internal: `smartgateway refund failed: ${err}` });
    }

    interface RefundResponse {
      id?: string;
      status?: string;
    }
    const data = (await res.json()) as RefundResponse;

    return {
      providerRefundId: data.id || `ref_${Date.now()}`,
      status: data.status === 'SUCCESS' ? 'processed' : 'pending',
    };
  }
}
