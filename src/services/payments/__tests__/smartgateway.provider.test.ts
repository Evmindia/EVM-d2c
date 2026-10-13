import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server env so the adapter has test credentials.
vi.mock('@/lib/config/server-env', () => ({
  serverEnv: () => ({
    PAYMENT_PROVIDER: 'smartgateway',
    HDFC_SMARTGATEWAY_API_KEY: 'test_api_key',
    HDFC_SMARTGATEWAY_MERCHANT_ID: 'SG_TEST_MID',
    HDFC_SMARTGATEWAY_RESPONSE_KEY: 'test_response_key',
    HDFC_SMARTGATEWAY_PAYMENT_PAGE_CLIENT_ID: 'hdfcmaster',
    HDFC_SMARTGATEWAY_BASE_URL: 'https://smartgateway.hdfcuat.bank.in',
    PAYMENT_KEY_ID: '',
    PAYMENT_KEY_SECRET: '',
    PAYMENT_WEBHOOK_SECRET: '',
  }),
}));

import { SmartGatewayProvider, mapSmartGatewayStatus } from '@/services/payments/providers/smartgateway';

const provider = new SmartGatewayProvider();

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('SmartGateway mapSmartGatewayStatus', () => {
  it('maps standard status strings to internal PaymentStatus', () => {
    expect(mapSmartGatewayStatus('CHARGED')).toBe('CAPTURED');
    expect(mapSmartGatewayStatus('ORDER_SUCCEEDED')).toBe('CAPTURED');
    expect(mapSmartGatewayStatus('AUTHORIZED')).toBe('AUTHORIZED');
    expect(mapSmartGatewayStatus('FAILED')).toBe('FAILED');
    expect(mapSmartGatewayStatus('ORDER_FAILED')).toBe('FAILED');
    expect(mapSmartGatewayStatus('NEW')).toBe('PENDING');
    expect(mapSmartGatewayStatus('PENDING')).toBe('PENDING');
    expect(mapSmartGatewayStatus('REFUNDED')).toBe('REFUNDED');
    expect(mapSmartGatewayStatus(undefined)).toBe('PENDING');
  });
});

describe('SmartGateway createOrder', () => {
  it('creates session with amount in rupees and returns hosted paymentUrl', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'NEW',
          id: 'ordeh_12345',
          order_id: 'EVM-TEST1234',
          payment_links: {
            web: 'https://smartgateway.hdfcuat.bank.in/payment-page/order/ordeh_12345',
          },
        }),
        { status: 200 },
      ),
    );

    const res = await provider.createOrder({
      orderId: 'EVM-TEST1234',
      amount: { value: 149900, currency: 'INR' },
      idempotencyKey: 'idem_key',
      customerEmail: 'test@example.com',
    });

    expect(res.provider).toBe('smartgateway');
    expect(res.providerOrderId).toBe('EVM-TEST1234');
    expect(res.amount.value).toBe(149900);
    expect(res.checkoutPayload.paymentUrl).toBe(
      'https://smartgateway.hdfcuat.bank.in/payment-page/order/ordeh_12345',
    );

    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe('https://smartgateway.hdfcuat.bank.in/session');
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.order_id).toBe('EVMTEST1234');
    expect(body.amount).toBe('1499.00'); // converted to rupees
    expect(body.payment_page_client_id).toBe('hdfcmaster');
  });
});

describe('SmartGateway fetchPayment', () => {
  it('fetches order status server-to-server and converts amount to paise', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'ordeh_12345',
          order_id: 'EVM-TEST1234',
          status: 'CHARGED',
          amount: 1499.0,
          currency: 'INR',
        }),
        { status: 200 },
      ),
    );

    const fetched = await provider.fetchPayment('EVM-TEST1234');
    expect(fetched.providerOrderId).toBe('EVM-TEST1234');
    expect(fetched.status).toBe('CAPTURED');
    expect(fetched.amount).toBe(149900);
    expect(fetched.currency).toBe('INR');
  });
});

describe('SmartGateway verifyWebhook', () => {
  it('parses webhook payload and maps charged event to CAPTURED', async () => {
    const rawBody = JSON.stringify({
      event_name: 'ORDER_SUCCEEDED',
      order_id: 'EVM-TEST1234',
      status: 'CHARGED',
      amount: 1499.0,
      currency: 'INR',
    });

    const result = await provider.verifyWebhook(rawBody, {});
    expect(result.valid).toBe(true);
    expect(result.status).toBe('CAPTURED');
    expect(result.eventType).toBe('payment.captured');
    expect(result.amount).toBe(149900);
  });
});
