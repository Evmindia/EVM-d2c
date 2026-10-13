import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { authenticate } from '@/lib/security/auth';
import { mergeGuestIntoUser } from '@/services/cart/cart.service';
import { GUEST_COOKIE, isValidGuestToken } from '@/lib/cart/guest-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/cart/merge — merge the guest cart into the authenticated user cart.
 *
 * Requires a verified user (identity from the token, not the body). The guest
 * token is taken from the httpOnly cookie only — never from the request body —
 * so a caller cannot merge an arbitrary cart. Quantities are summed then clamped
 * to the per-item max (deterministic, never invalid). The guest cookie is
 * cleared afterwards.
 */
export const POST = route(
  async ({ req }) => {
    const principal = await authenticate(req);
    const guestToken = req.cookies.get(GUEST_COOKIE)?.value;

    if (!isValidGuestToken(guestToken)) {
      // Nothing to merge; return the user's current cart unchanged.
      throw new AppError('bad_request', { internal: 'no valid guest cart to merge' });
    }

    const view = await mergeGuestIntoUser(principal.uid, guestToken);
    const res = ok(view);
    // Clear the guest cookie now that the cart has been merged.
    res.cookies.set(GUEST_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  },
  { rateLimit: 'cart_merge' },
);
