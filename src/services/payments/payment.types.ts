/**
 * Provider-agnostic payment domain types.
 *
 * NOTE: The actual payment gateway is PENDING (Razorpay / Cashfree / other).
 * These types describe the vendor-neutral contract used by the payment service
 * and every provider adapter. Amounts are integers in the smallest currency
 * unit (paise for INR) to avoid floating-point money bugs.
 */

export type PaymentProviderId = 'razorpay' | 'cashfree' | 'smartgateway';

export type Currency = 'INR';

/**
 * Provider-neutral payment status. Matches the Phase 4 payment state machine
 * (services/orders/order.state-machine.ts) so payment + order stay consistent.
 */
export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

/** Server-computed order amount. NEVER derived from client input. */
export interface MoneyAmount {
  /** Integer, smallest currency unit (e.g. paise). */
  value: number;
  currency: Currency;
}

export interface CreatePaymentOrderInput {
  /** Our internal order id (already created server-side). */
  orderId: string;
  amount: MoneyAmount;
  /** Idempotency key so retries do not create duplicate provider orders. */
  idempotencyKey: string;
  customerEmail?: string;
}

export interface CreatePaymentOrderResult {
  provider: PaymentProviderId;
  providerOrderId: string;
  amount: MoneyAmount;
  /** Opaque data the client needs to open the provider's checkout. */
  checkoutPayload: Record<string, string>;
}

export interface VerifyPaymentInput {
  orderId: string;
  providerOrderId: string;
  providerPaymentId: string;
  /** Provider signature to verify server-side. */
  signature: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  providerPaymentId: string;
  status: PaymentStatus;
  /** Amount + currency as reported by the provider (for server cross-check). */
  amount: number | null;
  currency: string | null;
  /** Provider order id the payment belongs to (for cross-check). */
  providerOrderId: string | null;
}

export interface WebhookVerifyResult {
  valid: boolean;
  /** Provider event id, used for idempotency + replay protection. */
  eventId: string;
  /** Explicit event type (allow-listed by the service). */
  eventType: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  amount?: number | null;
  currency?: string | null;
  status?: PaymentStatus;
}

// ---- Payment record (provider-neutral persistence) -------------------------
export interface PaymentRecord {
  paymentId: string; // internal id
  orderId: string; // internal order doc id
  orderReference: string; // customer-facing order number
  ownerType: 'guest' | 'user';
  userId: string | null;
  provider: PaymentProviderId;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  amount: number; // paise, from the authoritative order
  currency: Currency;
  status: PaymentStatus;
  failureCode: string | null;
  failureReason: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  capturedAt: string | null;
}

/** Customer-facing payment DTO (allow-listed; never provider secrets/metadata). */
export interface PublicPayment {
  orderReference: string;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
}

/** Browser-safe info to open the provider checkout. No secrets. */
export interface CheckoutInit {
  provider: PaymentProviderId;
  /** Public provider key (safe for the browser). */
  keyId: string;
  providerOrderId: string;
  amount: number; // paise, authoritative
  currency: Currency;
  orderReference: string;
  /** Direct URL to hosted payment page (e.g. SmartGateway hosted checkout). */
  paymentUrl?: string;
  checkoutPayload?: Record<string, string>;
}

export interface FetchedPayment {
  providerPaymentId: string;
  providerOrderId: string | null;
  amount: number | null;
  currency: string | null;
  status: PaymentStatus;
}

export interface RefundInput {
  paymentId: string;
  providerPaymentId: string;
  amount: MoneyAmount;
  /** Idempotency key so retries do not double-refund. */
  idempotencyKey: string;
  reason?: string;
}

export interface RefundResult {
  providerRefundId: string;
  status: 'processed' | 'pending' | 'failed';
}
