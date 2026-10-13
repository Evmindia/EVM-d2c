import 'server-only';

/**
 * Resolve the cart identity for a request — SERVER-SIDE ONLY.
 *
 *  - Authenticated: identity is derived from the VERIFIED Firebase token
 *    (never from the request body). A user can only ever act on their own cart.
 *  - Guest: identity comes from the secure httpOnly cookie token. On a write with
 *    no valid cookie, a fresh secure token is minted and must be set on the
 *    response (returned as `newGuestToken`). Reads never create a cart.
 *
 * This is the single choke point that prevents cart IDOR / takeover: the caller
 * cannot influence which cart is used beyond presenting their own credential.
 */
import type { NextRequest } from 'next/server';
import { authenticateOptional } from '@/lib/security/auth';
import { isAuthenticated } from '@/types/domain';
import { GUEST_COOKIE, isValidGuestToken, newGuestToken } from '@/lib/cart/guest-cookie';
import type { CartIdentity } from '@/services/cart/cart.service';

export interface ResolvedCartIdentity {
  /** null only for a guest read with no existing cookie (=> empty cart). */
  identity: CartIdentity | null;
  /** Set when a new guest cookie must be written to the response. */
  newGuestToken?: string;
}

export async function resolveCartIdentity(
  req: NextRequest,
  opts: { createGuest: boolean },
): Promise<ResolvedCartIdentity> {
  const principal = await authenticateOptional(req);
  if (isAuthenticated(principal)) {
    return { identity: { kind: 'user', uid: principal.uid } };
  }

  const cookie = req.cookies.get(GUEST_COOKIE)?.value;
  if (isValidGuestToken(cookie)) {
    return { identity: { kind: 'guest', token: cookie } };
  }

  if (opts.createGuest) {
    const token = newGuestToken();
    return { identity: { kind: 'guest', token }, newGuestToken: token };
  }

  return { identity: null };
}
