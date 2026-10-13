/**
 * The contract every payment gateway adapter must implement.
 *
 * The payment SERVICE (payment.service.ts) depends only on this interface, so
 * swapping Razorpay <-> Cashfree <-> another provider is a config + adapter
 * change with zero changes to business logic or API routes.
 *
 * Security guarantees that live in the SERVICE (not the provider): server-side
 * amount calculation, order/payment state machine, inventory transactions.
 * Guarantees that live in the PROVIDER: signature/HMAC verification, webhook
 * signature checks. Idempotency + replay protection are enforced by the service
 * using provider-supplied ids/events.
 */
import type {
  CreatePaymentOrderInput,
  CreatePaymentOrderResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  WebhookVerifyResult,
  RefundInput,
  RefundResult,
  FetchedPayment,
  PaymentProviderId,
} from './payment.types';

export interface PaymentProvider {
  readonly id: PaymentProviderId;

  /** The public key the browser needs to open the provider checkout. */
  publicKey(): string;

  /** Create a provider-side order for an already-created internal order. */
  createOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult>;

  /** Verify a client-reported payment result via provider signature. */
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;

  /**
   * Fetch the authoritative payment from the provider (for amount/currency/state
   * cross-check). Never trusts client-reported amounts.
   */
  fetchPayment(providerPaymentId: string): Promise<FetchedPayment>;

  /**
   * Verify a raw webhook request (signature + payload). Implementations must
   * validate the provider signature over the RAW body and return a stable
   * event id for the service's idempotency/replay checks.
   */
  verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookVerifyResult>;

  /** Issue a refund (authorization + idempotency enforced by the service). */
  refund(input: RefundInput): Promise<RefundResult>;
}
