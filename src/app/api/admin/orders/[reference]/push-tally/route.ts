import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { requireAdmin } from '@/lib/auth/require-admin';
import { requirePermission as assertPermission } from '@/lib/security/authorize';
import { getByOrderNumber } from '@/services/orders/order.repository';
import { isValidOrderNumber } from '@/services/orders/order-number';
import { sendOrderToTally } from '@/services/tally/tally.service';
import { toAdminOrder } from '@/services/admin/admin.dto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/orders/[reference]/push-tally — Manually push an order to Tally ERP.
 */
export const POST = route(
  async ({ req }) => {
    const principal = await requireAdmin(req);
    assertPermission(principal, 'orders:update');
    const parts = req.nextUrl.pathname.split('/').filter(Boolean);
    const ref = parts[parts.length - 2] ?? ''; // .../orders/[reference]/push-tally
    if (!isValidOrderNumber(ref)) throw new AppError('not_found');

    const order = await getByOrderNumber(ref);
    if (!order) throw new AppError('not_found');

    const success = await sendOrderToTally(order);
    const updated = await getByOrderNumber(ref);

    return ok({
      success,
      order: updated ? toAdminOrder(updated) : null,
    });
  },
  { sameOrigin: true, rateLimit: 'admin_write' },
);
