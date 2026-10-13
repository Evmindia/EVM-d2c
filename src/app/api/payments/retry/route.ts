import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { parseJsonBody } from '@/lib/security/validate';
import { resolvePaymentCaller } from '../_lib/caller';
import { retryPayment } from '@/services/payments/payment.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/retry — retry payment for an eligible PAYMENT_PENDING order.
 * Ownership + payable-state are re-verified server-side; PAID/CANCELLED/REFUNDED
 * orders are rejected. Creates a fresh provider order attempt for the same
 * internal order.
 */
const bodySchema = z
  .object({ orderReference: z.string().trim().regex(/^EVM-[0-9A-HJKMNP-TV-Z]{8}$/, 'invalid order') })
  .strict();

export const POST = route(
  async ({ req }) => {
    const { orderReference } = await parseJsonBody(req, bodySchema);
    const caller = await resolvePaymentCaller(req);
    const init = await retryPayment(caller, orderReference);
    return ok(init);
  },
  { rateLimit: 'payment_retry', sameOrigin: true },
);
