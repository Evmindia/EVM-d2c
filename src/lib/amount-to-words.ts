/**
 * Converts a numeric amount in Rupees into Indian currency words.
 * Example: 1250 -> "Rupees One Thousand Two Hundred Fifty Only"
 */
const UNITS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const TEENS = [
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertChunk(n: number): string {
  if (n === 0) return '';
  if (n < 10) return UNITS[n] ?? '';
  if (n < 20) return TEENS[n - 10] ?? '';
  if (n < 100) return `${TENS[Math.floor(n / 10)] ?? ''} ${UNITS[n % 10] ?? ''}`.trim();
  return `${UNITS[Math.floor(n / 100)] ?? ''} Hundred ${convertChunk(n % 100)}`.trim();
}

export function numberToWordsInr(rupees: number): string {
  const rounded = Math.floor(Math.abs(rupees));
  if (rounded === 0) return 'Rupees Zero Only';

  let num = rounded;
  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const remaining = num;

  const parts: string[] = [];

  if (crore > 0) parts.push(`${convertChunk(crore)} Crore`);
  if (lakh > 0) parts.push(`${convertChunk(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${convertChunk(thousand)} Thousand`);
  if (remaining > 0) parts.push(convertChunk(remaining));

  return `Rupees ${parts.join(' ').trim()} Only`;
}
