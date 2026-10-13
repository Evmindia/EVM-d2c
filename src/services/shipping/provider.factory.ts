import 'server-only';
import type { ShippingProvider } from './shipping-provider.interface';
import { serverEnv } from '@/lib/config/server-env';

/**
 * Selects the active shipping provider from SHIPPING_PROVIDER (default bluedart).
 * Lazily imported so only the selected adapter is bundled. The Blue Dart adapter
 * is a stub until credentials are provided (see providers/bluedart.ts).
 */
export async function getShippingProvider(): Promise<ShippingProvider> {
  const provider = serverEnv().SHIPPING_PROVIDER;
  switch (provider) {
    case 'bluedart':
    default: {
      const { BlueDartProvider } = await import('./providers/bluedart');
      return new BlueDartProvider();
    }
  }
}
