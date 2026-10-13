import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { parseJsonBody } from '@/lib/security/validate';
import { resolvePaymentCaller } from '../_lib/caller';
import { createPaymentForOrder } from '@/services/payments/payment.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/create — create a provider order for an owned, payable
 * order and return browser-safe checkout info (public key + provider order id +
 * authoritative amount). The client sends ONLY the order reference; amount,
 * currency, and provider order id come from the server order — never the body.
 */
const bodySchema = z
  .object({ orderReference: z.string().trim().regex(/^EVM-[0-9A-HJKMNP-TV-Z]{8}$/, 'invalid order') })
  .strict();

export const POST = route(
  async ({ req }) => {
    const { orderReference } = await parseJsonBody(req, bodySchema);
    const caller = await resolvePaymentCaller(req);
    const init = await createPaymentForOrder(caller, orderReference);
    return ok(init);
  },
  { rateLimit: 'payment_create', sameOrigin: true },
);
