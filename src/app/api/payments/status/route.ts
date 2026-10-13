import { route, ok } from '@/app/api/_lib/handler';
import { validate } from '@/lib/security/validate';
import { z } from 'zod';
import { resolvePaymentCaller } from '../_lib/caller';
import { getPaymentStatus } from '@/services/payments/payment.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const orderRefSchema = z.string().trim().regex(/^EVM-[0-9A-HJKMNP-TV-Z]{8}$/, 'invalid order');

/**
 * GET /api/payments/status?order=EVM-XXXXXXXX — server-authoritative payment
 * status for an owned order. Used by the success page to poll (never trusts the
 * browser's return as proof of payment). Returns the safe payment DTO only.
 */
export const GET = route(
  async ({ req }) => {
    const orderReference = validate(orderRefSchema, req.nextUrl.searchParams.get('order') ?? undefined);
    const caller = await resolvePaymentCaller(req);
    const payment = await getPaymentStatus(caller, orderReference);
    return ok(payment);
  },
  { rateLimit: 'payment_status' },
);
