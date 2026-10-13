/**
 * Tax provider contract. A future real provider (once EVM supplies GST/HSN
 * rules, or decides tax is price-inclusive) implements this. The checkout
 * calculator depends only on this interface + the returned TaxQuote status.
 */
import type { TaxQuote, TaxQuoteInput } from './tax.types';

export interface TaxProvider {
  readonly id: string;
  quote(input: TaxQuoteInput): Promise<TaxQuote>;
}
