import { route, ok } from '@/app/api/_lib/handler';
import { requireOrderStaff } from '@/lib/auth/require-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/me — the verified staff's role + permissions, for UI gating
 * ONLY. UI hiding is NOT authorization; every admin API independently enforces
 * it. Returns 403 for non-staff. Exposes no secrets.
 */
export const GET = route(
  async ({ req }) => {
    const principal = await requireOrderStaff(req);
    return ok({ uid: principal.uid, role: principal.role, permissions: principal.permissions });
  },
  { rateLimit: 'admin_read' },
);
