import { route, ok } from '@/app/api/_lib/handler';
import { parseJsonBody, validate } from '@/lib/security/validate';
import { docIdSchema } from '@/lib/validation/catalog';
import { updateItemSchema } from '@/lib/validation/cart';
import { resolveCartIdentity } from '../../_lib/identity';
import { updateItem, removeItem } from '@/services/cart/cart.service';
import { EMPTY_CART_VIEW } from '@/services/cart/cart.types';
import { GUEST_COOKIE, guestCookieOptions } from '@/lib/cart/guest-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function productIdFromPath(pathname: string): string {
  return validate(docIdSchema, pathname.split('/').filter(Boolean).pop());
}

/** PATCH /api/cart/items/[productId] — set absolute quantity (idempotent). */
export const PATCH = route(
  async ({ req }) => {
    const productId = productIdFromPath(req.nextUrl.pathname);
    const body = await parseJsonBody(req, updateItemSchema);
    const variantId = req.nextUrl.searchParams.get('variantId') ?? body.variantId;
    const { identity, newGuestToken } = await resolveCartIdentity(req, { createGuest: false });
    if (!identity) return ok(EMPTY_CART_VIEW('guest'));
    const view =
      variantId !== undefined && variantId !== null
        ? await updateItem(identity, productId, body.quantity, variantId)
        : await updateItem(identity, productId, body.quantity);
    const res = ok(view);
    if (newGuestToken) res.cookies.set(GUEST_COOKIE, newGuestToken, guestCookieOptions);
    return res;
  },
  { rateLimit: 'cart_write' },
);

/** DELETE /api/cart/items/[productId] — remove a line. */
export const DELETE = route(
  async ({ req }) => {
    const productId = productIdFromPath(req.nextUrl.pathname);
    const variantId = req.nextUrl.searchParams.get('variantId');
    const { identity, newGuestToken } = await resolveCartIdentity(req, { createGuest: false });
    if (!identity) return ok(EMPTY_CART_VIEW('guest'));
    const view =
      variantId !== undefined && variantId !== null
        ? await removeItem(identity, productId, variantId)
        : await removeItem(identity, productId);
    const res = ok(view);
    if (newGuestToken) res.cookies.set(GUEST_COOKIE, newGuestToken, guestCookieOptions);
    return res;
  },
  { rateLimit: 'cart_write' },
);
