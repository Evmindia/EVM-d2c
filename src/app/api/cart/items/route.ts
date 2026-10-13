import { route, ok } from '@/app/api/_lib/handler';
import { parseJsonBody } from '@/lib/security/validate';
import { addItemSchema } from '@/lib/validation/cart';
import { resolveCartIdentity } from '../_lib/identity';
import { addItem } from '@/services/cart/cart.service';
import { GUEST_COOKIE, guestCookieOptions } from '@/lib/cart/guest-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/cart/items — add a product (productId + quantity only).
 * Product is re-read + validated server-side (existence/active). Any price /
 * subtotal in the body is rejected by the strict schema and never trusted.
 * A guest cookie is minted + set on first write.
 */
export const POST = route(
  async ({ req }) => {
    const body = await parseJsonBody(req, addItemSchema);
    const { identity, newGuestToken } = await resolveCartIdentity(req, { createGuest: true });
    // identity is always present here (createGuest: true).
    const view =
      body.variantId !== undefined
        ? await addItem(identity!, body.productId, body.quantity ?? 1, body.variantId)
        : await addItem(identity!, body.productId, body.quantity ?? 1);
    const res = ok(view, { status: 200 });
    if (newGuestToken) res.cookies.set(GUEST_COOKIE, newGuestToken, guestCookieOptions);
    return res;
  },
  { rateLimit: 'cart_write' },
);
