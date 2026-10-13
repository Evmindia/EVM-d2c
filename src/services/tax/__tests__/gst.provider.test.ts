import { describe, it, expect } from 'vitest';
import { GstTaxProvider } from '@/services/tax/providers/gst';
import type { TaxLineInput } from '@/services/tax/tax.types';

const gst = new GstTaxProvider();

// Helper: a valid taxable line. Money in integer paise. ₹999 = 99900 paise.
function line(overrides: Partial<TaxLineInput> = {}): TaxLineInput {
  return {
    productId: 'p1',
    hsn: '85183090',
    gstRate: 0.18,
    quantity: 1,
    lineSubtotal: 99900, // ₹999
    ...overrides,
  };
}

async function quote(lines: TaxLineInput[], destinationState: string) {
  const subtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0);
  return gst.quote({ lines, destinationState, subtotal });
}

describe('GST provider — approved EVM figures (GST-exclusive, product-authoritative rate)', () => {
  it('1. Maharashtra ₹999 @ 18% -> CGST 8991, SGST 8991, IGST 0', async () => {
    const q = await quote([line()], 'Maharashtra');
    expect(q.status).toBe('CONFIGURED');
    expect(q.breakdown).toEqual({ cgst: 8991, sgst: 8991, igst: 0, rate: 0.18, intraState: true });
    expect(q.amount).toBe(17982);
  });

  it('2. Other state (Karnataka) ₹999 @ 18% -> IGST 17982, CGST/SGST 0', async () => {
    const q = await quote([line()], 'Karnataka');
    expect(q.breakdown).toEqual({ cgst: 0, sgst: 0, igst: 17982, rate: 0.18, intraState: false });
    expect(q.amount).toBe(17982);
  });

  it('3. ₹3999 @ 18% — intra & inter', async () => {
    const intra = await quote([line({ lineSubtotal: 399900 })], 'Maharashtra');
    expect(intra.breakdown).toMatchObject({ cgst: 35991, sgst: 35991, igst: 0 });
    expect(intra.amount).toBe(71982);
    const inter = await quote([line({ lineSubtotal: 399900 })], 'Delhi');
    expect(inter.breakdown).toMatchObject({ cgst: 0, sgst: 0, igst: 71982 });
    expect(inter.amount).toBe(71982);
  });

  it('4. multiple products with DIFFERENT GST rates (rate=null; per-line rate used)', async () => {
    const q = await quote(
      [line({ lineSubtotal: 99900, gstRate: 0.18 }), line({ productId: 'p2', lineSubtotal: 100000, gstRate: 0.12 })],
      'Maharashtra',
    );
    // line1: cgst/sgst 8991 each; line2: 100000*0.06 = 6000 each.
    expect(q.breakdown).toMatchObject({ cgst: 14991, sgst: 14991, igst: 0, rate: null });
    expect(q.amount).toBe(29982); // 17982 + 12000
    expect(q.breakdown!.cgst + q.breakdown!.sgst + q.breakdown!.igst).toBe(q.amount);
  });

  it('5. multiple quantities (₹999 x3) @ 18% intra', async () => {
    const q = await quote([line({ quantity: 3, lineSubtotal: 299700 })], 'Maharashtra');
    expect(q.amount).toBe(53946); // 299700 * 0.18
    expect(q.breakdown).toMatchObject({ cgst: 26973, sgst: 26973, igst: 0 });
  });

  it('6. rounding edge — half-up to nearest paise, components sum to amount', async () => {
    // 50 paise @ 18%: per-half = 50*0.09 = 4.5 -> rounds to 5 (half-up).
    const q = await quote([line({ lineSubtotal: 50 })], 'Maharashtra');
    expect(q.breakdown).toMatchObject({ cgst: 5, sgst: 5, igst: 0 });
    expect(q.amount).toBe(10);
    expect(q.breakdown!.cgst + q.breakdown!.sgst + q.breakdown!.igst).toBe(q.amount);
    // A fractional case: 12345 @ 18% intra -> 1111.05 -> 1111 each.
    const q2 = await quote([line({ lineSubtotal: 12345 })], 'Maharashtra');
    expect(q2.amount).toBe(2222);
    expect(q2.breakdown!.cgst + q2.breakdown!.sgst + q2.breakdown!.igst).toBe(q2.amount);
  });
});

describe('GST provider — safety: never assume 0 tax', () => {
  it('7. missing HSN -> NOT_CONFIGURED', async () => {
    const q = await quote([line({ hsn: null })], 'Maharashtra');
    expect(q.status).toBe('NOT_CONFIGURED');
    expect(q.amount).toBeNull();
    expect(q.breakdown).toBeNull();
  });

  it('8. missing GST rate -> NOT_CONFIGURED (not treated as 0)', async () => {
    const q = await quote([line({ gstRate: null })], 'Maharashtra');
    expect(q.status).toBe('NOT_CONFIGURED');
    expect(q.amount).toBeNull();
  });

  it('9. invalid GST rate (>1 / NaN) -> NOT_CONFIGURED', async () => {
    expect((await quote([line({ gstRate: 1.5 })], 'Maharashtra')).status).toBe('NOT_CONFIGURED');
    expect((await quote([line({ gstRate: Number.NaN })], 'Maharashtra')).status).toBe('NOT_CONFIGURED');
    expect((await quote([line({ gstRate: -0.1 })], 'Maharashtra')).status).toBe('NOT_CONFIGURED');
  });

  it('10. invalid/unknown destination state -> NOT_CONFIGURED (no calc)', async () => {
    expect((await quote([line()], 'Wakanda')).status).toBe('NOT_CONFIGURED');
    expect((await quote([line()], '')).status).toBe('NOT_CONFIGURED');
    expect((await quote([line()], '99')).status).toBe('NOT_CONFIGURED'); // not a real state code
  });

  it('unavailable (0-subtotal) lines are ignored and do not force pending', async () => {
    const q = await quote(
      [line(), { productId: 'x', hsn: null, gstRate: null, quantity: 1, lineSubtotal: 0 }],
      'Maharashtra',
    );
    expect(q.status).toBe('CONFIGURED');
    expect(q.amount).toBe(17982);
  });

  it('17. consistency: CGST + SGST + IGST == amount (intra & inter)', async () => {
    for (const state of ['Maharashtra', 'Tamil Nadu']) {
      const q = await quote([line({ lineSubtotal: 123457 }), line({ productId: 'p2', lineSubtotal: 88881 })], state);
      expect(q.breakdown!.cgst + q.breakdown!.sgst + q.breakdown!.igst).toBe(q.amount);
    }
  });
});

describe('GST provider — state normalization (no substring matching)', () => {
  it('accepts case/whitespace variants + code 27 for Maharashtra (intra)', async () => {
    for (const s of ['Maharashtra', 'MAHARASHTRA', '  maharashtra ', 'maharasha', '27']) {
      const q = await quote([line()], s);
      expect(q.breakdown!.intraState).toBe(true);
    }
  });
  it('recognizes aliases (Orissa -> Odisha) as valid inter-state', async () => {
    const q = await quote([line()], 'Orissa');
    expect(q.status).toBe('CONFIGURED');
    expect(q.breakdown!.intraState).toBe(false);
  });
  it('does NOT substring-match ("Maha" is not Maharashtra)', async () => {
    expect((await quote([line()], 'Maha')).status).toBe('NOT_CONFIGURED');
    expect((await quote([line()], 'Maharashtrapur')).status).toBe('NOT_CONFIGURED');
  });
});
