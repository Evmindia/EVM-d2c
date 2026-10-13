import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTallyItemName, sendOrderToTally } from '../tally.service';
import type { Order } from '@/services/orders/order.types';

const patchOrderMock = vi.fn(async () => {});
vi.mock('@/services/orders/order.repository', () => ({
  patchOrder: (...args: unknown[]) => (patchOrderMock as any)(...args),
}));

describe('tally.service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('getTallyItemName', () => {
    it('maps known SKUs to Tally master item names', () => {
      expect(getTallyItemName('EVM-P0301-W', 'Fallback')).toBe(
        'Power Bank 10000Mah (EVM P0301) - EnMag Ace White',
      );
      expect(getTallyItemName('EVM-WHF-01-BU', 'Fallback')).toBe(
        'EnSonic EVM-WHF-01 BLUE Wireless Bluetooth headphone with mic',
      );
      expect(getTallyItemName('EVM-HF01-B', 'Fallback')).toBe(
        'Type-C Earphone EVM-HF-01 Black',
      );
      expect(getTallyItemName('EVMP0301', 'Fallback')).toBe(
        'Power Bank 10000Mah (EVM P0301) - EnMag Ace White',
      );
    });

    it('matches case-insensitively and trims whitespace', () => {
      expect(getTallyItemName(' evm-p0301-w ', 'Fallback')).toBe(
        'Power Bank 10000Mah (EVM P0301) - EnMag Ace White',
      );
    });

    it('falls back to product title snapshot when SKU is unmapped or undefined', () => {
      expect(getTallyItemName('UNKNOWN-SKU', 'My Product Title')).toBe('My Product Title');
      expect(getTallyItemName(undefined, 'Fallback Title')).toBe('Fallback Title');
    });
  });

  describe('sendOrderToTally payload formatting and routing', () => {
    const baseOrder: Order = {
      id: 'ord_123',
      orderNumber: 'EVM-2026-0001',
      ownerType: 'guest',
      userId: null,
      accessTokenHash: null,
      customerEmail: 'customer@example.com',
      couponCode: null,
      orderStatus: 'SHIPPED',
      shipmentStatus: 'CREATED',
      payment: {
        status: 'CAPTURED',
        provider: 'razorpay',
        providerOrderId: 'order_123',
        providerPaymentId: 'pay_123',
      },
      items: [
        {
          productId: 'prod_1',
          sku: 'EVM-P0301-W',
          productTitleSnapshot: 'Power Bank',
          unitPrice: 100000,
          quantity: 1,
          lineSubtotal: 100000,
        },
      ],
      subtotal: 100000,
      discount: 0,
      tax: {
        status: 'CONFIGURED',
        amount: 18000,
        breakdown: {
          cgst: 9000,
          sgst: 9000,
          igst: 0,
          rate: 0.18,
          intraState: true,
        },
      },
      shipping: { status: 'CONFIGURED', amount: 0 },
      total: 118000,
      currency: 'INR',
      customerName: 'Rahul Sharma',
      customerPhone: '9876543210',
      shippingAddress: {
        fullName: 'Rahul Sharma',
        phone: '9876543210',
        addressLine1: 'Flat 101, Galaxy Apt',
        addressLine2: 'Andheri West',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400053',
        country: 'India',
      },
      billingAddress: {
        fullName: 'Rahul Sharma',
        phone: '9876543210',
        addressLine1: 'Flat 101, Galaxy Apt',
        addressLine2: 'Andheri West',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400053',
        country: 'India',
      },
      createdAt: '2026-09-11T10:00:00.000Z',
      updatedAt: '2026-09-11T10:00:00.000Z',
    };

    it('builds local sale payload for Maharashtra with CGST and SGST', async () => {
      let capturedPayload: any = null;
      let capturedHeaders: any = null;

      global.fetch = vi.fn(async (_url: any, options: any) => {
        capturedHeaders = options.headers;
        capturedPayload = JSON.parse(options.body);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }) as any;

      process.env.TALLY_API_KEY = 'secret-test-key';

      const success = await sendOrderToTally(baseOrder);
      expect(success).toBe(true);

      expect(capturedHeaders['x-api-key']).toBe('secret-test-key');
      expect(capturedHeaders['api-key']).toBe('secret-test-key');
      expect(capturedHeaders['Authorization']).toBe('Bearer secret-test-key');

      const sale = capturedPayload.Sale[0];
      expect(sale.VoucherType).toBe('Sales (Vasai)');
      expect(sale.SalesLedger).toBe('Local Sales');
      expect(sale.PartyLedgerName).toBe('D2C Local Sales');
      expect(sale.TotalAmount).toBe(1180);
      expect(sale.ItemDetails[0].ItemName).toBe(
        'Power Bank 10000Mah (EVM P0301) - EnMag Ace White',
      );
      expect(sale.ItemDetails[0].GodownName).toBe('VASAI BRANCH');
      expect(sale.ItemDetails[0].Quantity).toBe(1);
      expect(sale.ItemDetails[0].Qty).toBe(1);
      expect(sale.ItemDetails[0].BilledQty).toBe(1);
      expect(sale.ItemDetails[0].ActualQty).toBe(1);
      expect(sale.ItemDetails[0].Unit).toBe('PCS');
      expect(sale.TotalQty).toBe(1);
      expect(sale.TotalQuantity).toBe(1);
      expect(sale.OrderNo).toBe('EVM-2026-0001');
      expect(sale.PONumber).toBe('EVM-2026-0001');

      const ledgerNames = sale.LedgerDetails.map((l: any) => l.LedgerName);
      expect(ledgerNames).toContain('D2C Local Sales');
      expect(ledgerNames).toContain('CGST OUTPUT');
      expect(ledgerNames).toContain('SGST OUTPUT');
      expect(ledgerNames).not.toContain('IGST OUTPUT');

      expect(patchOrderMock).toHaveBeenCalledWith('ord_123', expect.objectContaining({
        tallyStatus: 'SENT',
      }));
    });

    it('builds interstate sale payload for other states with IGST', async () => {
      let capturedPayload: any = null;

      global.fetch = vi.fn(async (_url: any, options: any) => {
        capturedPayload = JSON.parse(options.body);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }) as any;

      const interstateOrder: Order = {
        ...baseOrder,
        shippingAddress: {
          ...baseOrder.shippingAddress!,
          state: 'Rajasthan',
          city: 'Jaipur',
          postalCode: '302016',
        },
        billingAddress: {
          ...baseOrder.billingAddress!,
          state: 'Rajasthan',
          city: 'Jaipur',
          postalCode: '302016',
        },
        tax: {
          status: 'CONFIGURED',
          amount: 18000,
          breakdown: {
            cgst: 0,
            sgst: 0,
            igst: 18000,
            rate: 0.18,
            intraState: false,
          },
        },
      };

      const success = await sendOrderToTally(interstateOrder);
      expect(success).toBe(true);

      const sale = capturedPayload.Sale[0];
      expect(sale.SalesLedger).toBe('Sales (interstate)');
      expect(sale.PartyLedgerName).toBe('D2C Interstate Sales');

      const ledgerNames = sale.LedgerDetails.map((l: any) => l.LedgerName);
      expect(ledgerNames).toContain('D2C Interstate Sales');
      expect(ledgerNames).toContain('IGST OUTPUT');
      expect(ledgerNames).not.toContain('CGST OUTPUT');
      expect(ledgerNames).not.toContain('SGST OUTPUT');
    });

    it('handles failure from Tally endpoint and marks tallyStatus as FAILED', async () => {
      global.fetch = vi.fn(async () => {
        return new Response(JSON.stringify({ success: false, message: 'Invalid API key' }), {
          status: 401,
        });
      }) as any;

      const success = await sendOrderToTally(baseOrder);
      expect(success).toBe(false);
      expect(patchOrderMock).toHaveBeenCalledWith('ord_123', {
        tallyStatus: 'FAILED',
      });
    });
  });
});
