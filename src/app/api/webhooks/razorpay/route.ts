import { NextResponse, type NextRequest } from 'next/server';
import { processWebhook } from '@/services/payments/payment.service';
import { errorResponse } from '@/lib/security/errors';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/razorpay — Razorpay webhook receiver.
 *
 * SECURITY:
 *  - PUBLIC endpoint (Razorpay must reach it) — it does NOT use Firebase/customer
 *    auth. Trust comes solely from the Razorpay webhook SIGNATURE.
 *  - The RAW request body is read and passed to the provider for HMAC
 *    verification BEFORE any JSON parsing (we never parse+reserialize before
 *    verifying — that would break the signature).
 *  - Idempotent: duplicate/replayed events are no-ops (see processWebhook).
 *  - Event allow-list: only expected payment events mutate state.
 *  - Not covered by the standard rate-limit wrapper, so legitimate provider
 *    retries are never blocked; signature + idempotency are the protections.
 *
 * Status codes: 200 for handled/ignored/duplicate (stop retries); 400 for an
 * invalid signature (forged); 500 for transient processing errors (Razorpay
 * will retry). No secrets or internals are ever returned.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  try {
    // Read the EXACT raw body for signature verification.
    const rawBody = await req.text();
    const headers: Record<string, string> = {
      'x-razorpay-signature': req.headers.get('x-razorpay-signature') ?? '',
      'x-razorpay-event-id': req.headers.get('x-razorpay-event-id') ?? '',
    };

    const result = await processWebhook(rawBody, headers);

    if (!result.ok && result.reason === 'invalid_signature') {
      // Forged / tampered webhook — reject.
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    // Handled, ignored (unsupported event), or duplicate -> 200 to stop retries.
    return NextResponse.json({ ok: true, handled: result.handled }, { status: 200 });
  } catch (err) {
    logger.error('webhook_processing_error', { requestId });
    // Transient error -> 500 so the provider retries; body carries no internals.
    return errorResponse(err, requestId);
  }
}
