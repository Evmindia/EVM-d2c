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
import { AppError, NotImplementedError } from '@/lib/security/errors';
import { logger } from '@/lib/logger';

/**
 * Razorpay adapter — the ONLY module with Razorpay-specific behavior.
 *
 * Implemented with Razorpay's documented REST API (Basic auth) + HMAC-SHA256
 * signature verification via Node crypto — no SDK dependency (consistent with
 * the project's minimal-surface adapters). The key_secret and webhook_secret are
 * read from server-only env and NEVER leave this module or appear in logs.
 *
 * Money is always integer paise. Amounts come from the caller (server order),
 * never from the browser.
 */
const API_BASE = 'https://api.razorpay.com/v1';

function creds(): { keyId: string; keySecret: string } {
  const env = serverEnv();
  const keyId = env.RAZORPAY_KEY_ID || env.PAYMENT_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET || env.PAYMENT_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new AppError('configuration_pending', { internal: 'Razorpay credentials not configured' });
  }
  return { keyId, keySecret };
}

function webhookSecret(): string {
  const env = serverEnv();
  const secret = env.RAZORPAY_WEBHOOK_SECRET || env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) throw new AppError('configuration_pending', { internal: 'Razorpay webhook secret not configured' });
  return secret;
}

function authHeader(): string {
  const { keyId, keySecret } = creds();
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}

/** Map a Razorpay payment/status string to our provider-neutral PaymentStatus. */
function mapStatus(razorpayStatus: string): PaymentStatus {
  switch (razorpayStatus) {
    case 'captured':
      return 'CAPTURED';
    case 'authorized':
      return 'AUTHORIZED';
    case 'failed':
      return 'FAILED';
    case 'refunded':
      return 'REFUNDED';
    default:
      return 'PENDING';
  }
}

/** Constant-time hex comparison. */
function safeHexEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export class RazorpayProvider implements PaymentProvider {
  readonly id = 'razorpay' as const;

  publicKey(): string {
    return creds().keyId;
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult> {
    // Amount is authoritative (paise) from the server order. Never from client.
    const body = {
      amount: input.amount.value,
      currency: input.amount.currency,
      receipt: input.orderId,
      notes: { orderReference: input.orderId },
    };
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      logger.error('razorpay_create_order_failed', { status: res.status });
      throw new AppError('internal_error', { internal: `razorpay create order ${res.status}` });
    }
    const order = (await res.json()) as { id: string; amount: number; currency: string };
    return {
      provider: 'razorpay',
      providerOrderId: order.id,
      amount: { value: order.amount, currency: input.amount.currency },
      checkoutPayload: { keyId: this.publicKey() },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    // Razorpay client-callback signature = HMAC_SHA256(order_id|payment_id, secret).
    const expected = createHmac('sha256', creds().keySecret)
      .update(`${input.providerOrderId}|${input.providerPaymentId}`)
      .digest('hex');
    const verified = safeHexEqual(expected, input.signature);
    if (!verified) {
      return {
        verified: false,
        providerPaymentId: input.providerPaymentId,
        status: 'FAILED',
        amount: null,
        currency: null,
        providerOrderId: null,
      };
    }
    // Signature valid -> fetch the authoritative payment for amount/state check.
    const fetched = await this.fetchPayment(input.providerPaymentId);
    return {
      verified: true,
      providerPaymentId: fetched.providerPaymentId,
      status: fetched.status,
      amount: fetched.amount,
      currency: fetched.currency,
      providerOrderId: fetched.providerOrderId,
    };
  }

  async fetchPayment(providerPaymentId: string): Promise<FetchedPayment> {
    const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(providerPaymentId)}`, {
      headers: { Authorization: authHeader() },
    });
    if (!res.ok) {
      throw new AppError('internal_error', { internal: `razorpay fetch payment ${res.status}` });
    }
    const p = (await res.json()) as {
      id: string;
      order_id: string | null;
      amount: number;
      currency: string;
      status: string;
    };
    return {
      providerPaymentId: p.id,
      providerOrderId: p.order_id,
      amount: p.amount,
      currency: p.currency,
      status: mapStatus(p.status),
    };
  }

  async verifyWebhook(
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<WebhookVerifyResult> {
    // Verify HMAC over the EXACT raw body (never parse before verifying).
    const signature = headers['x-razorpay-signature'] ?? '';
    const expected = createHmac('sha256', webhookSecret()).update(rawBody).digest('hex');
    if (!signature || !safeHexEqual(expected, signature)) {
      return { valid: false, eventId: '', eventType: '' };
    }
    // Signature valid -> now it is safe to parse.
    let event: {
      event?: string;
      id?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string; status?: string } } };
    };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return { valid: false, eventId: '', eventType: '' };
    }
    const entity = event.payload?.payment?.entity;
    return {
      valid: true,
      // Prefer the provider's delivery id header for idempotency; fall back to
      // a body-derived id.
      eventId: headers['x-razorpay-event-id'] ?? event.id ?? `${event.event}:${entity?.id ?? ''}`,
      eventType: event.event ?? '',
      providerOrderId: entity?.order_id,
      providerPaymentId: entity?.id,
      amount: typeof entity?.amount === 'number' ? entity.amount : null,
      currency: entity?.currency ?? null,
      status: entity?.status ? mapStatus(entity.status) : undefined,
    };
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    // Refunds are a later phase (policy PENDING). Not implemented here.
    throw new NotImplementedError('RazorpayProvider.refund (refunds are a later phase)');
  }
}
