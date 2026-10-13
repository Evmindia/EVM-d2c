import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { requireAdmin } from '@/lib/auth/require-admin';
import { requirePermission as assertPermission } from '@/lib/security/authorize';
import { markAdminOrderPaidForTest } from '@/services/admin/admin.service';
import { isValidOrderNumber } from '@/services/orders/order-number';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/orders/[reference]/mark-paid — TEST-ONLY. Marks an order PAID
 * without a real payment so the fulfillment/shipping flow can be exercised before
 * the payment gateway is live. The service refuses this in production.
 */
export const PATCH = route(
  async ({ req, requestId }) => {
    const principal = await requireAdmin(req);
    assertPermission(principal, 'orders:update');
    const parts = req.nextUrl.pathname.split('/').filter(Boolean);
    const ref = parts[parts.length - 2] ?? ''; // .../orders/[reference]/mark-paid
    if (!isValidOrderNumber(ref)) throw new AppError('not_found');

    const updated = await markAdminOrderPaidForTest(ref, {
      uid: principal.uid,
      role: principal.role,
      requestId,
    });
    return ok(updated);
  },
  { sameOrigin: true, rateLimit: 'admin_write' },
);
