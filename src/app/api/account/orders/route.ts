import { route, ok } from '@/app/api/_lib/handler';
import { requireUser } from '@/lib/auth/require-auth';
import { listOrdersForUser } from '@/services/orders/order.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/account/orders — the authenticated user's own orders.
 * Ownership is enforced by querying on the verified uid (reuses the existing
 * order ownership service). A user can never see another user's orders.
 * Returns allow-listed public order DTOs only.
 */
export const GET = route(
  async ({ req }) => {
    const principal = await requireUser(req);
    const orders = await listOrdersForUser(principal.uid);
    return ok({ orders });
  },
  { rateLimit: 'auth_account_read' },
);
