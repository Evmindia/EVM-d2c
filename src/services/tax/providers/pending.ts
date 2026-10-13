import type { TaxProvider } from '../tax-provider.interface';
import type { TaxQuote, TaxQuoteInput } from '../tax.types';

/**
 * PENDING tax provider — retained as the safe fallback when GST is not
 * configured. Returns NOT_CONFIGURED with a null amount; it deliberately does
 * NOT return 0% (which would be a false claim). Checkout treats this as "tax
 * configuration pending" and does not produce a final total.
 */
export class PendingTaxProvider implements TaxProvider {
  readonly id = 'pending';

  async quote(_input: TaxQuoteInput): Promise<TaxQuote> {
    return {
      status: 'NOT_CONFIGURED',
      amount: null,
      breakdown: null,
      note: 'Tax configuration (GST/HSN) is pending.',
    };
  }
}
