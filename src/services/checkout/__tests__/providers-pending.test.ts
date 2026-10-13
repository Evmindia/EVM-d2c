import { describe, it, expect } from 'vitest';
import { quoteTax } from '@/services/tax/tax.service';
import { getShippingQuote } from '@/services/shipping/shipping.service';

describe('tax provider is now GST (configured) — via tax.service', () => {
  it('returns NOT_CONFIGURED (never 0%) when product tax data / state is missing', async () => {
    // No valid destination state -> the GST provider safely reports NOT_CONFIGURED.
    const q = await quoteTax({ subtotal: 99800, lines: [] });
    expect(q.status).toBe('NOT_CONFIGURED');
    expect(q.amount).toBeNull();
  });

  it('returns a CONFIGURED GST quote for a valid line + destination state', async () => {
    const q = await quoteTax({
      subtotal: 99900,
      destinationState: 'Maharashtra',
      lines: [{ productId: 'p1', hsn: '85183090', gstRate: 0.18, quantity: 1, lineSubtotal: 99900 }],
    });
    expect(q.status).toBe('CONFIGURED');
    expect(q.amount).toBe(17982);
    expect(q.breakdown).toMatchObject({ cgst: 8991, sgst: 8991, igst: 0 });
  });
});

describe('shipping provider is PENDING (no fake charge/date)', () => {
  it('returns NOT_CONFIGURED with a null amount and no method/date', async () => {
    const q = await getShippingQuote({
      destinationPostalCode: '560001',
      destinationState: 'Karnataka',
      itemCount: 2,
    });
    expect(q.status).toBe('NOT_CONFIGURED');
    expect(q.amount).toBeNull();
    expect(q.method).toBeNull();
    expect(q.note).toMatch(/pending/i);
  });
});
