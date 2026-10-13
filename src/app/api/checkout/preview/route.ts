import { route, ok } from '@/app/api/_lib/handler';
import { parseJsonBody } from '@/lib/security/validate';
import { checkoutInputSchema } from '@/lib/validation/checkout';
import { resolveCartIdentity } from '@/app/api/cart/_lib/identity';
import { previewCheckout } from '@/services/checkout/checkout.service';
import type { CheckoutInput } from '@/services/checkout/checkout.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout/preview — server-authoritative checkout summary.
 * Validates customer/address input (strict; rejects injected monetary fields),
 * resolves the cart server-side, recalculates everything. Does NOT create an
 * order. No cart is created for a guest here (createGuest: false).
 */
export const POST = route(
  async ({ req }) => {
    const input = (await parseJsonBody(req, checkoutInputSchema)) as CheckoutInput;
    const { identity } = await resolveCartIdentity(req, { createGuest: false });
    if (!identity) {
      // No cart at all -> empty, non-completable summary (not an error).
      return ok({
        items: [],
        subtotal: 0,
        discount: 0,
        couponCode: null,
        tax: { status: 'NOT_CONFIGURED', amount: null, breakdown: null, note: 'Tax configuration pending.' },
        shipping: {
          status: 'NOT_CONFIGURED',
          amount: null,
          method: null,
          note: 'Shipping configuration pending.',
        },
        total: null,
        currency: 'INR',
        configurationComplete: false,
        hasUnavailable: false,
        issues: ['Cart is empty.'],
      });
    }
    const summary = await previewCheckout(identity, input);
    return ok(summary);
  },
  { rateLimit: 'checkout' },
);
