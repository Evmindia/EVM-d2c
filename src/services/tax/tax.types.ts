/**
 * Tax domain types (provider-agnostic).
 *
 * A quote carries an explicit status; only a CONFIGURED quote contributes an
 * amount to the order total. The system NEVER invents a rate or silently
 * computes 0% — missing/invalid product tax data or an unknown destination state
 * yields NOT_CONFIGURED. All money is integer paise.
 */
export type TaxStatus = 'CONFIGURED' | 'NOT_CONFIGURED';

export interface TaxLineInput {
  productId: string;
  /** Authoritative HSN code from the product (server-side catalog). */
  hsn: string | null;
  /**
   * Authoritative GST rate from the product, as a fraction (e.g. 0.18 = 18%).
   * NEVER supplied by the client. Missing/invalid -> NOT_CONFIGURED.
   */
  gstRate: number | null;
  lineSubtotal: number; // paise (unit price * quantity), from catalog
  quantity: number;
}

export interface TaxQuoteInput {
  lines: TaxLineInput[];
  /** Destination (place of supply) state name from the shipping address. */
  destinationState?: string;
  subtotal: number; // paise
}

/**
 * GST breakdown in integer paise. For an intra-state supply cgst+sgst carry the
 * tax and igst is 0; for inter-state igst carries it and cgst=sgst=0. By
 * construction cgst + sgst + igst == the quote amount.
 */
export interface TaxBreakdown {
  cgst: number; // paise
  sgst: number; // paise
  igst: number; // paise
  /** The applied GST rate as a fraction when uniform across lines, else null. */
  rate: number | null;
  /** True for an intra-state (same-state) supply. */
  intraState: boolean;
}

export interface TaxQuote {
  status: TaxStatus;
  /** Total tax in paise. null while NOT_CONFIGURED (never fabricated). */
  amount: number | null;
  /** Present (non-null) only when CONFIGURED. */
  breakdown: TaxBreakdown | null;
  /** Human-safe note explaining the status. */
  note: string;
}
