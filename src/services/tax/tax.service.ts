import 'server-only';

/**
 * Tax service. Selects the active tax provider (only PENDING exists today) and
 * returns its quote. Kept behind a factory so a real GST provider can be added
 * later via configuration without touching checkout.
 */
import type { TaxProvider } from './tax-provider.interface';
import type { TaxQuote, TaxQuoteInput } from './tax.types';
import { GstTaxProvider } from './providers/gst';

let provider: TaxProvider | null = null;

function getTaxProvider(): TaxProvider {
  // EVM has approved GST configuration (seller state Maharashtra, GST-exclusive
  // pricing), so the Indian GST provider is active. It self-reports
  // NOT_CONFIGURED for any product missing HSN/gstRate or an unknown destination
  // state — never assuming 0. (PendingTaxProvider remains as a fallback for a
  // future explicit "tax disabled" configuration.)
  if (!provider) provider = new GstTaxProvider();
  return provider;
}

export async function quoteTax(input: TaxQuoteInput): Promise<TaxQuote> {
  return getTaxProvider().quote(input);
}
