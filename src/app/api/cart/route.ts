import { route, ok } from '@/app/api/_lib/handler';
import { resolveCartIdentity } from './_lib/identity';
import { getCartView, clearCart } from '@/services/cart/cart.service';
import { EMPTY_CART_VIEW } from '@/services/cart/cart.types';
import { GUEST_COOKIE, guestCookieOptions } from '@/lib/cart/guest-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/cart — server-authoritative cart view (guest or user). */
export const GET = route(
  async ({ req }) => {
    const { identity } = await resolveCartIdentity(req, { createGuest: false });
    if (!identity) return ok(EMPTY_CART_VIEW('guest'));
    const view = await getCartView(identity);
    return ok(view);
  },
  { rateLimit: 'cart_read' },
);

/** DELETE /api/cart — clear the cart. */
export const DELETE = route(
  async ({ req }) => {
    const { identity, newGuestToken } = await resolveCartIdentity(req, { createGuest: false });
    if (!identity) return ok(EMPTY_CART_VIEW('guest'));
    const view = await clearCart(identity);
    const res = ok(view);
    if (newGuestToken) res.cookies.set(GUEST_COOKIE, newGuestToken, guestCookieOptions);
    return res;
  },
  { rateLimit: 'cart_write' },
);
