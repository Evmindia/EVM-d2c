import { route, ok } from '@/app/api/_lib/handler';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getDashboard } from '@/services/admin/admin.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/dashboard — bounded operational summary (admin). Uses count()
 * aggregation; returns null (N/A) for any unavailable metric. No fake financials.
 */
export const GET = route(
  async ({ req }) => {
    await requireAdmin(req);
    return ok(await getDashboard());
  },
  { rateLimit: 'admin_read' },
);
