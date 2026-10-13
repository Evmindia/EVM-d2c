import type { TaxProvider } from '../tax-provider.interface';
import type { TaxQuote, TaxQuoteInput, TaxBreakdown } from '../tax.types';
import { resolveStateCode, isIntraState } from '../gst.config';

/**
 * Indian GST provider (money-critical).
 *
 * PRICING: product prices are GST-EXCLUSIVE — GST is added on top of the
 * authoritative catalog line value. The GST RATE comes from each product's
 * server-side `gstRate` (a fraction, e.g. 0.18) — never from the client, and the
 * rate is NOT hardcoded (different products may carry different rates).
 *
 * PLACE OF SUPPLY: determined from the destination (shipping) state resolved to
 * an official GST state code.
 *   - intra-state (destination == seller state): CGST = SGST = rate/2, IGST = 0
 *   - inter-state:                                CGST = SGST = 0,      IGST = rate
 *
 * ROUNDING POLICY (single, explicit): all money is integer paise. Each taxable
 * line's per-component GST is rounded to the nearest paise (Math.round), then
 * summed across lines. The quote amount is DEFINED as cgst + sgst + igst, so
 * `cgst + sgst + igst === amount` always holds, and `subtotal + amount` is the
 * exact pre-shipping total (no one-paise drift).
 *
 * SAFETY: if the destination state is unknown/invalid, or ANY charged line is
 * missing a valid HSN or gstRate, the quote is NOT_CONFIGURED (null amount) —
 * tax is never silently assumed to be 0.
 */
function roundPaise(value: number): number {
  return Math.round(value);
}

/** A finite fraction in [0, 1]. Explicit 0 is a valid (exempt) rate. */
function isValidRate(rate: number | null | undefined): rate is number {
  return typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 && rate <= 1;
}

function isValidHsn(hsn: string | null | undefined): hsn is string {
  return typeof hsn === 'string' && hsn.trim().length > 0;
}

function notConfigured(note: string): TaxQuote {
  return { status: 'NOT_CONFIGURED', amount: null, breakdown: null, note };
}

export class GstTaxProvider implements TaxProvider {
  readonly id = 'gst-in';

  async quote(input: TaxQuoteInput): Promise<TaxQuote> {
    // 1) Destination place of supply must be a KNOWN Indian state.
    const destCode = resolveStateCode(input.destinationState);
    if (!destCode) {
      return notConfigured('Destination state is missing or not a recognized Indian state.');
    }
    const intraState = isIntraState(destCode);

    // 2) Validate + compute over CHARGED lines (lineSubtotal > 0). Unavailable/
    //    unpriced lines (subtotal 0) contribute no tax and are not validated here
    //    (the checkout calculator blocks on availability separately).
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    const ratesSeen = new Set<number>();

    for (const line of input.lines) {
      if (line.lineSubtotal <= 0) continue; // not charged -> no tax
      if (!isValidHsn(line.hsn)) {
        return notConfigured('One or more products are missing a valid HSN code.');
      }
      if (!isValidRate(line.gstRate)) {
        return notConfigured('One or more products are missing a valid GST rate.');
      }
      ratesSeen.add(line.gstRate);

      if (intraState) {
        cgst += roundPaise((line.lineSubtotal * line.gstRate) / 2);
        sgst += roundPaise((line.lineSubtotal * line.gstRate) / 2);
      } else {
        igst += roundPaise(line.lineSubtotal * line.gstRate);
      }
    }

    // No charged lines at all -> nothing to tax, but not an error state; a
    // configured 0 tax on an empty/zero taxable base is valid.
    const amount = cgst + sgst + igst;
    const breakdown: TaxBreakdown = {
      cgst,
      sgst,
      igst,
      rate: ratesSeen.size === 1 ? [...ratesSeen][0]! : null,
      intraState,
    };

    return {
      status: 'CONFIGURED',
      amount,
      breakdown,
      note: intraState ? 'Intra-state supply (CGST + SGST).' : 'Inter-state supply (IGST).',
    };
  }
}
