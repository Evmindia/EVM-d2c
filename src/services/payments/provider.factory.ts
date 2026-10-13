import 'server-only';
import type { PaymentProvider } from './payment-provider.interface';
import { serverEnv } from '@/lib/config/server-env';
import { AppError } from '@/lib/security/errors';

/**
 * Selects the active payment provider from PAYMENT_PROVIDER.
 *
 * PENDING — when set to 'pending' (the Phase 1 default), NO provider is active
 * and this throws a safe error. This guarantees we never accidentally run a
 * half-configured gateway. Providers are lazily imported so unselected adapters
 * are never bundled.
 */
export async function getPaymentProvider(): Promise<PaymentProvider> {
  const provider = serverEnv().PAYMENT_PROVIDER;

  switch (provider) {
    case 'razorpay': {
      const { RazorpayProvider } = await import('./providers/razorpay');
      return new RazorpayProvider();
    }
    case 'cashfree': {
      const { CashfreeProvider } = await import('./providers/cashfree');
      return new CashfreeProvider();
    }
    case 'smartgateway': {
      const { SmartGatewayProvider } = await import('./providers/smartgateway');
      return new SmartGatewayProvider();
    }
    case 'pending':
    default:
      throw new AppError('not_implemented', {
        internal: 'Payment provider is PENDING; none selected (PAYMENT_PROVIDER=pending).',
      });
  }
}

export function isPaymentProviderConfigured(): boolean {
  return serverEnv().PAYMENT_PROVIDER !== 'pending';
}
