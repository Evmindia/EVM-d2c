import 'server-only';

/**
 * Guest order access capability cookie.
 *
 * At order creation, the guest's access token is set in an httpOnly cookie so
 * the order-success page and subsequent order reads can prove ownership without
 * putting the capability in the URL (which would leak via logs/referrers). The
 * token is also returned once in the response body. Not stored in localStorage.
 */
import { isProduction } from '@/lib/config/env';

export const ORDER_COOKIE = 'evm_ot';

export const orderCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24, // 24h — enough for the immediate post-order flow
};
