import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { authenticateOptional } from '@/lib/security/auth';
import { isAuthenticated } from '@/types/domain';
import { getOrderForCaller } from '@/services/orders/order.service';
import { isValidOrderNumber } from '@/services/orders/order-number';
import { ORDER_COOKIE } from '@/lib/orders/order-cookie';
import { isValidGuestToken } from '@/lib/cart/guest-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/[orderReference] — fetch a single order with access control.
 *
 * Access requires EITHER authenticated ownership (order.userId == verified uid)
 * OR a valid guest capability token (from the httpOnly order cookie or the
 * `x-order-access-token` header). Anything else returns 404 (no existence leak).
 * Only the allow-listed public order DTO is returned.
 */
export const GET = route(
  async ({ req }) => {
    let ref = req.nextUrl.pathname.split('/').filter(Boolean).pop() ?? '';
    if (!isValidOrderNumber(ref) && ref.startsWith('EVM') && ref.length === 11) {
      ref = `EVM-${ref.slice(3)}`;
    }
    if (!isValidOrderNumber(ref)) {
      // Malformed reference -> 404 (do not reveal validation internals here).
      throw new AppError('not_found');
    }

    const principal = await authenticateOptional(req);
    const uid = isAuthenticated(principal) ? principal.uid : null;

    // Guest capability: header takes precedence, else the httpOnly cookie.
    const headerToken = req.headers.get('x-order-access-token');
    const cookieToken = req.cookies.get(ORDER_COOKIE)?.value ?? null;
    const rawCapability = headerToken || cookieToken;
    // Access tokens share the 64-hex-char shape of guest tokens; validate shape
    // before use to reject tampered/garbage values.
    const capabilityToken = isValidGuestToken(rawCapability ?? undefined) ? rawCapability : null;

    const order = await getOrderForCaller(ref, { uid, capabilityToken });
    return ok(order);
  },
  { rateLimit: 'order_read' },
);
