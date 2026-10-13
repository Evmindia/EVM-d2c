import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { parseJsonBody } from '@/lib/security/validate';
import { resolvePaymentCaller } from '../_lib/caller';
import { verifyAndCapture } from '@/services/payments/payment.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/verify — verify a client-reported payment.
 *
 * The server cryptographically verifies the provider signature and cross-checks
 * the provider order id + amount + currency + state against the authoritative
 * order/payment record before capturing. A browser-claimed "success" alone can
 * NEVER mark the order PAID. Returns the safe payment DTO (no secrets).
 */
const bodySchema = z
  .object({
    orderReference: z.string().trim().regex(/^EVM-[0-9A-HJKMNP-TV-Z]{8}$/, 'invalid order'),
    providerOrderId: z.string().trim().min(1).max(128),
    providerPaymentId: z.string().trim().min(1).max(128),
    signature: z.string().trim().min(1).max(512),
  })
  .strict();

export const POST = route(
  async ({ req }) => {
    const body = await parseJsonBody(req, bodySchema);
    const caller = await resolvePaymentCaller(req);
    const payment = await verifyAndCapture(caller, body);
    return ok(payment);
  },
  { rateLimit: 'payment_verify', sameOrigin: true },
);
