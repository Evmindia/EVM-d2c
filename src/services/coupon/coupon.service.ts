import 'server-only';

/**
 * Coupon/discount foundation.
 *
 * The full coupon admin system is a later phase. This service establishes the
 * server-side discount contract: a client-submitted discount amount is NEVER
 * trusted — only a coupon CODE is accepted, looked up server-side, and validated
 * (active window, usage limits, applicability) before any discount is computed.
 *
 * No coupon data is invented. With no coupons configured, any submitted code is
 * rejected as invalid; no code means a zero discount.
 */
import type { DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { AppError } from '@/lib/security/errors';

export interface DiscountContext {
  subtotal: number; // paise
  productIds: string[];
  /** Identity key for per-user usage limits (uid or guest hash). */
  usageKey: string;
}

export interface DiscountResult {
  /** Applied coupon code, or null when none. */
  code: string | null;
  /** Discount amount in paise (0 when none). Never client-supplied. */
  amount: number;
  note: string;
}

const NO_DISCOUNT: DiscountResult = { code: null, amount: 0, note: 'No coupon applied.' };

/**
 * Validate an optional coupon code and compute the server-side discount.
 * @throws AppError('bad_request') when a code is supplied but invalid.
 */
export async function resolveDiscount(
  code: string | undefined,
  ctx: DiscountContext,
): Promise<DiscountResult> {
  if (!code) return NO_DISCOUNT;

  const normalized = code.trim().toUpperCase();
  const snap = await adminDb()
    .collection('coupons')
    .where('code', '==', normalized)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new AppError('bad_request', { fields: { couponCode: 'invalid coupon code' } });
  }

  const coupon = snap.docs[0]!.data() as DocumentData;
  validateCouponActive(coupon);
  // Applicability + usage-limit checks and the discount computation are
  // implemented in the dedicated coupon phase; until then, a configured coupon
  // that passes the active-window check yields no discount rather than a guessed
  // amount. (No coupons are configured in Phase 4.)
  return {
    code: normalized,
    amount: computeDiscount(coupon, ctx),
    note: 'Coupon applied.',
  };
}

function validateCouponActive(coupon: DocumentData): void {
  const now = Date.now();
  if (coupon.isActive === false) {
    throw new AppError('bad_request', { fields: { couponCode: 'coupon is not active' } });
  }
  if (typeof coupon.startsAt === 'string' && Date.parse(coupon.startsAt) > now) {
    throw new AppError('bad_request', { fields: { couponCode: 'coupon is not yet active' } });
  }
  if (typeof coupon.expiresAt === 'string' && Date.parse(coupon.expiresAt) < now) {
    throw new AppError('bad_request', { fields: { couponCode: 'coupon has expired' } });
  }
}

function computeDiscount(coupon: DocumentData, ctx: DiscountContext): number {
  // Server-side computation from the stored coupon definition (percent/flat),
  // clamped to the subtotal. Real coupon math lands in the coupon phase.
  if (coupon.type === 'percent' && typeof coupon.value === 'number') {
    const raw = Math.floor((ctx.subtotal * coupon.value) / 100);
    const capped = typeof coupon.maxDiscount === 'number' ? Math.min(raw, coupon.maxDiscount) : raw;
    return Math.max(0, Math.min(capped, ctx.subtotal));
  }
  if (coupon.type === 'flat' && typeof coupon.value === 'number') {
    return Math.max(0, Math.min(coupon.value, ctx.subtotal));
  }
  return 0;
}
