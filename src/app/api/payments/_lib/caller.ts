import 'server-only';

/**
 * Resolve the payment caller identity — reuses the ORDER access model, so a
 * caller can only act on an order they own (authenticated uid) or hold a valid
 * guest capability for. The capability comes from the httpOnly order cookie or
 * the x-order-access-token header — never from the URL, and never logged.
 */
import type { NextRequest } from 'next/server';
import { authenticateOptional } from '@/lib/security/auth';
import { isAuthenticated } from '@/types/domain';
import { ORDER_COOKIE } from '@/lib/orders/order-cookie';
import { isValidGuestToken } from '@/lib/cart/guest-cookie';
import type { OrderCaller } from '@/services/orders/order.service';

export async function resolvePaymentCaller(req: NextRequest): Promise<OrderCaller> {
  const principal = await authenticateOptional(req);
  const uid = isAuthenticated(principal) ? principal.uid : null;

  const headerToken = req.headers.get('x-order-access-token');
  const cookieToken = req.cookies.get(ORDER_COOKIE)?.value ?? null;
  const raw = headerToken || cookieToken;
  const capabilityToken = isValidGuestToken(raw ?? undefined) ? raw : null;

  return { uid, capabilityToken };
}
