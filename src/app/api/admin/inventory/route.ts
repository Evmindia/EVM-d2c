import { route, ok } from '@/app/api/_lib/handler';
import { requireAdmin } from '@/lib/auth/require-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/inventory — inventory is CONFIGURATION PENDING.
 *
 * EVM inventory rules are not finalized, so stock MUTATION is disabled. Stock
 * VISIBILITY is available on the product records (stockStatus) via the product
 * admin views. This endpoint intentionally exposes no mutation and returns the
 * pending state so the UI can render it honestly (no invented stock rules).
 */
export const GET = route(
  async ({ req }) => {
    await requireAdmin(req);
    return ok({
      status: 'NOT_CONFIGURED',
      mutationEnabled: false,
      message: 'Inventory configuration pending — stock mutation is disabled.',
    });
  },
  { rateLimit: 'admin_read' },
);
