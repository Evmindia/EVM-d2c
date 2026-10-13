import 'server-only';
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
} from '../payment.types';
import { NotImplementedError } from '@/lib/security/errors';

/**
 * Cashfree adapter — STUB ONLY.
 *
 * PENDING — the payment gateway is not finalized by management. Same as the
 * Razorpay stub: conforms to the interface, throws NotImplemented everywhere.
 * Implemented only after the provider is confirmed. No SDK, no credentials.
 */
export class CashfreeProvider implements PaymentProvider {
  readonly id = 'cashfree' as const;

  publicKey(): string {
    throw new NotImplementedError('CashfreeProvider.publicKey (provider PENDING)');
  }

  async createOrder(_input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult> {
    throw new NotImplementedError('CashfreeProvider.createOrder (provider PENDING)');
  }

  async verifyPayment(_input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    throw new NotImplementedError('CashfreeProvider.verifyPayment (provider PENDING)');
  }

  async fetchPayment(_providerPaymentId: string): Promise<FetchedPayment> {
    throw new NotImplementedError('CashfreeProvider.fetchPayment (provider PENDING)');
  }

  async verifyWebhook(
    _rawBody: string,
    _headers: Record<string, string>,
  ): Promise<WebhookVerifyResult> {
    throw new NotImplementedError('CashfreeProvider.verifyWebhook (provider PENDING)');
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    throw new NotImplementedError('CashfreeProvider.refund (provider PENDING)');
  }
}
