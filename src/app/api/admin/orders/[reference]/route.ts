import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { requireOrderStaff } from '@/lib/auth/require-admin';
import { requirePermission as assertPermission } from '@/lib/security/authorize';
import { parseJsonBody } from '@/lib/security/validate';
import { getAdminOrder, advanceAdminOrder } from '@/services/admin/admin.service';
import { isValidOrderNumber } from '@/services/orders/order-number';
import { ADMIN_SETTABLE_STATUSES } from '@/services/orders/order.state-machine';
import type { OrderStatus } from '@/services/orders/order.types';
import { recordAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/orders/[reference] — full admin order view (AdminOrder DTO).
 * PATCH advances fulfillment status (approve → pack → ship → deliver, or cancel).
 * Payment/system statuses (PAID/REFUND_*) are NOT settable here — those stay
 * owned by the payment/returns flows.
 */
export const GET = route(
  async ({ req, requestId }) => {
    const principal = await requireOrderStaff(req);
    const ref = req.nextUrl.pathname.split('/').filter(Boolean).pop() ?? '';
    if (!isValidOrderNumber(ref)) throw new AppError('not_found');
    const order = await getAdminOrder(ref);
    await recordAudit({
      action: 'order.view',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'order',
      resourceId: ref,
      requestId,
      metadata: {},
    });
    return ok(order);
  },
  { rateLimit: 'admin_read' },
);

const patchSchema = z
  .object({ status: z.enum(ADMIN_SETTABLE_STATUSES as [OrderStatus, ...OrderStatus[]]) })
  .strict();

export const PATCH = route(
  async ({ req, requestId }) => {
    // Must be staff (admin or warehouse); warehouse can pack/ship, cancel is admin-gated
    const principal = await requireOrderStaff(req);
    const ref = req.nextUrl.pathname.split('/').filter(Boolean).pop() ?? '';
    if (!isValidOrderNumber(ref)) throw new AppError('not_found');

    const body = await parseJsonBody(req, patchSchema);
    if (principal.role === 'warehouse') {
      if (body.status === 'CANCELLED') {
        throw new AppError('forbidden', { internal: 'warehouse role cannot cancel orders' });
      }
    } else {
      assertPermission(principal, body.status === 'CANCELLED' ? 'orders:cancel' : 'orders:update');
    }

    const updated = await advanceAdminOrder(ref, body.status, {
      uid: principal.uid,
      role: principal.role,
      requestId,
    });
    return ok(updated);
  },
  { sameOrigin: true, rateLimit: 'admin_write' },
);
