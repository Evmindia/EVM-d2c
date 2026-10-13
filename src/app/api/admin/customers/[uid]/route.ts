import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { requireAdmin } from '@/lib/auth/require-admin';
import { requirePermission } from '@/lib/auth/require-permission';
import { validate, parseJsonBody } from '@/lib/security/validate';
import { getAdminCustomer, setCustomerActive } from '@/services/admin/admin.service';
import { recordAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Firebase uid: bounded, safe charset (no slashes/traversal).
const uidSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/, 'invalid uid');

function uidFromPath(pathname: string): string {
  return validate(uidSchema, pathname.split('/').filter(Boolean).pop());
}

/** GET /api/admin/customers/[uid] — admin customer view (AdminCustomer DTO). */
export const GET = route(
  async ({ req }) => {
    await requireAdmin(req);
    const uid = uidFromPath(req.nextUrl.pathname);
    return ok(await getAdminCustomer(uid));
  },
  { rateLimit: 'admin_read' },
);

/**
 * POST /api/admin/customers/[uid] — set account active status (users:manage).
 * The target uid comes from the validated PATH, never a body userId. Audited.
 * Does not touch passwords/credentials/tokens.
 */
const bodySchema = z.object({ isActive: z.boolean() }).strict();

export const POST = route(
  async ({ req, requestId }) => {
    const principal = await requirePermission(req, 'users:manage');
    const uid = uidFromPath(req.nextUrl.pathname);
    const { isActive } = await parseJsonBody(req, bodySchema);
    const customer = await setCustomerActive(uid, isActive);
    await recordAudit({
      action: 'customer.status_change',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'customer',
      resourceId: uid,
      requestId,
      metadata: { isActive },
    });
    return ok(customer);
  },
  { rateLimit: 'admin_sensitive_action', sameOrigin: true },
);
