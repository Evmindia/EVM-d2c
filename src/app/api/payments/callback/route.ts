import { NextRequest, NextResponse } from 'next/server';
import { verifyAndCaptureCallback } from '@/services/payments/payment.service';
import { getPaymentByOrderId, getPaymentByProviderOrderId } from '@/services/payments/payment.repository';
import { getByOrderNumber, getOrderById } from '@/services/orders/order.repository';
import { siteUrl } from '@/lib/config/site';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleCallback(req: NextRequest): Promise<NextResponse> {
  const url = req.nextUrl;
  let orderId: string | null = url.searchParams.get('order_id') || url.searchParams.get('orderId');
  let status: string | null = url.searchParams.get('status');
  let signature: string | null = url.searchParams.get('signature');

  // Handle form-urlencoded or JSON POST if HDFC posts the callback
  if (req.method === 'POST') {
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData();
        orderId = orderId || (formData.get('order_id') as string | null);
        status = status || (formData.get('status') as string | null);
        signature = signature || (formData.get('signature') as string | null);
      } else if (contentType.includes('application/json')) {
        const json = (await req.json()) as Record<string, unknown>;
        orderId = orderId || (json.order_id as string | null);
        status = status || (json.status as string | null);
        signature = signature || (json.signature as string | null);
      }
    } catch (err) {
      logger.warn('callback_body_parse_failed', { err: String(err) });
    }
  }

  const baseRedirect = siteUrl();

  if (!orderId) {
    logger.warn('callback_missing_order_id', {});
    return NextResponse.redirect(`${baseRedirect}/checkout`, { status: 303 });
  }

  let resolvedOrderNumber = orderId;
  try {
    let order = await getByOrderNumber(orderId);
    if (!order) {
      const payment = await getPaymentByProviderOrderId(orderId);
      if (payment) {
        order = await getOrderById(payment.orderId);
      }
    }
    if (!order && orderId.startsWith('EVM') && orderId.length === 11) {
      order = await getByOrderNumber(`EVM-${orderId.slice(3)}`);
    }

    if (order) {
      resolvedOrderNumber = order.orderNumber;
    } else {
      logger.warn('callback_order_not_found', { orderId });
      return NextResponse.redirect(`${baseRedirect}/checkout`, { status: 303 });
    }

    const paymentRecord = await getPaymentByOrderId(order.id);
    const providerOrderId = paymentRecord?.providerOrderId || order.orderNumber;

    logger.info('smartgateway_callback_processing', {
      orderNumber: order.orderNumber,
      providerOrderId,
      status,
    });

    await verifyAndCaptureCallback(order.orderNumber, {
      providerOrderId,
      providerPaymentId: providerOrderId,
      signature: signature || '',
    });

    return NextResponse.redirect(`${baseRedirect}/order/success/${encodeURIComponent(order.orderNumber)}`, {
      status: 303,
    });
  } catch (err) {
    logger.error('smartgateway_callback_verification_error', { orderId, err: String(err) });
    return NextResponse.redirect(
      `${baseRedirect}/order/success/${encodeURIComponent(resolvedOrderNumber)}?payment_failed=true`,
      { status: 303 },
    );
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleCallback(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleCallback(req);
}
