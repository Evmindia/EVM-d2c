import { route, ok } from '@/app/api/_lib/handler';
import { requireAdmin } from '@/lib/auth/require-admin';
import { parseQuery } from '@/lib/security/validate';
import { z } from 'zod';
import { listAuditEvents } from '@/services/admin/admin.audit.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allow-listed filters only; bounded page size. NO delete/update endpoints exist
// for audit logs anywhere — they are append-only (also enforced by Firestore
// rules denying all client access).
const querySchema = z
  .object({
    actorUid: z.string().trim().max(128).regex(/^[A-Za-z0-9_-]+$/).optional(),
    action: z.string().trim().max(40).regex(/^[a-z_.]+$/).optional(),
    targetType: z.string().trim().max(40).regex(/^[a-z_]+$/).optional(),
    requestId: z.string().trim().max(64).regex(/^[A-Za-z0-9-]+$/).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(25),
    _: z.any().optional(),
  })
  .passthrough();

/** GET /api/admin/audit-logs — bounded, filtered audit list (admin). Read-only. */
export const GET = route(
  async ({ req }) => {
    await requireAdmin(req);
    const q = parseQuery(req, querySchema);
    const events = await listAuditEvents({
      limit: q.limit ?? 25,
      actorUid: q.actorUid,
      action: q.action,
      targetType: q.targetType,
      requestId: q.requestId,
    });
    return ok({ events });
  },
  { rateLimit: 'admin_read' },
);
