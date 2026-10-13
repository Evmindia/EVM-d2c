import { NextResponse, type NextRequest } from 'next/server';
import { processWebhook } from '@/services/payments/payment.service';
import { errorResponse } from '@/lib/security/errors';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/smartgateway — HDFC SmartGateway (Juspay) webhook receiver.
 *
 * SECURITY:
 *  - Public endpoint reachable by HDFC SmartGateway servers.
 *  - Verifies payload/signature using HDFC Response Key.
 *  - Idempotent: duplicate events are safely de-duplicated.
 *  - Only verified captured/charged events transition order status to PAID.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  try {
    const rawBody = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    const result = await processWebhook(rawBody, headers);

    if (!result.ok && result.reason === 'invalid_signature') {
      logger.warn('smartgateway_webhook_rejected_signature', { requestId });
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    return NextResponse.json({ ok: true, handled: result.handled }, { status: 200 });
  } catch (err) {
    logger.error('smartgateway_webhook_processing_error', { requestId, err: String(err) });
    return errorResponse(err, requestId);
  }
}
