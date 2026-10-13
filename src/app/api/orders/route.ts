import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { parseJsonBody, validate } from '@/lib/security/validate';
import { z } from 'zod';
import { checkoutInputSchema } from '@/lib/validation/checkout';
import { resolveCartIdentity } from '@/app/api/cart/_lib/identity';
import { createOrder } from '@/services/orders/order.service';
import type { CheckoutInput } from '@/services/checkout/checkout.types';
import { ORDER_COOKIE, orderCookieOptions } from '@/lib/orders/order-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Idempotency key: opaque, client-generated, bounded, safe charset.
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/, 'invalid idempotency key');

/**
 * POST /api/orders — create an order (server-authoritative, idempotent).
 *
 * Recomputes the checkout summary independently (never trusts the preview or any
 * client total). Requires an `Idempotency-Key` header so double-submits/retries
 * do not create duplicate orders. Order starts at PAYMENT_PENDING / PENDING.
 * Refuses to create an order when commercial config (tax/shipping) is pending.
 */
export const POST = route(
  async ({ req }) => {
    const idempotencyKey = validate(
      idempotencyKeySchema,
      req.headers.get('idempotency-key') ?? undefined,
    );
    const input = (await parseJsonBody(req, checkoutInputSchema)) as CheckoutInput;

    const { identity } = await resolveCartIdentity(req, { createGuest: false });
    if (!identity) {
      throw new AppError('bad_request', { internal: 'no cart to create an order from' });
    }

    const result = await createOrder(identity, input, idempotencyKey);

    const res = ok(
      { order: result.order, accessToken: result.accessToken, created: result.created },
      { status: result.created ? 201 : 200 },
    );
    // Set the guest capability cookie so the success page can read the order.
    if (result.accessToken) {
      res.cookies.set(ORDER_COOKIE, result.accessToken, orderCookieOptions);
    }
    return res;
  },
  { rateLimit: 'order_write' },
);
