/**
 * Display formatting helpers. These format REAL values only. When a value is
 * absent (null), callers render an explicit placeholder — never a fabricated
 * number.
 */

/** Format paise (integer, smallest unit) as INR. Returns null for null input. */
export function formatInr(paise: number | null): string | null {
  if (paise === null) return null;
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

export const STOCK_LABEL: Record<string, string> = {
  in_stock: 'In stock',
  out_of_stock: 'Out of stock',
  preorder: 'Pre-order',
};
