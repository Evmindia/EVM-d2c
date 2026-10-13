import { route, ok } from '@/app/api/_lib/handler';
import { requireOrderStaff } from '@/lib/auth/require-admin';
import { parseQuery } from '@/lib/security/validate';
import { z } from 'zod';
import { listAdminOrders, searchAdminOrders } from '@/services/admin/admin.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allow-listed filters/search only. Status is an enum; email is exact-match.
const querySchema = z
  .object({
    status: z
      .enum([
        'PAYMENT_PENDING',
        'PAID',
        'PROCESSING',
        'PACKED',
        'SHIPPED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
        'RETURN_REQUESTED',
        'RETURNED',
        'REFUND_PENDING',
        'REFUNDED',
      ])
      .optional(),
    email: z.string().trim().toLowerCase().max(254).email().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    _: z.any().optional(),
  })
  .passthrough();

/** GET /api/admin/orders — list/filter/search orders (staff/warehouse/admin). Bounded. */
export const GET = route(
  async ({ req }) => {
    await requireOrderStaff(req);
    const q = parseQuery(req, querySchema);
    if (q.email) {
      return ok({ orders: await searchAdminOrders(q.email) });
    }
    return ok({ orders: await listAdminOrders({ status: q.status, limit: q.limit ?? 25 }) });
  },
  { rateLimit: 'admin_search' },
);
