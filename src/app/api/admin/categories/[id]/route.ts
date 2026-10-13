import { route, ok } from '@/app/api/_lib/handler';
import { requirePermission } from '@/lib/auth/require-permission';
import { parseJsonBody, validate } from '@/lib/security/validate';
import { docIdSchema, categoryCreateSchema } from '@/lib/validation/catalog';
import { updateCategory } from '@/services/catalog/category.service';
import { recordAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updateSchema = categoryCreateSchema.partial().strict().refine(
  (v) => Object.keys(v).length > 0,
  'no fields to update',
);

/** PATCH /api/admin/categories/[id] — update / activate (admin + products:write). */
export const PATCH = route(
  async ({ req, requestId }) => {
    const principal = await requirePermission(req, 'products:write');
    const id = validate(docIdSchema, req.nextUrl.pathname.split('/').filter(Boolean).pop());
    const input = await parseJsonBody(req, updateSchema);
    const category = await updateCategory(id, input);
    await recordAudit({
      action: 'category.update',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'category',
      resourceId: id,
      requestId,
      metadata: { fields: Object.keys(input) },
    });
    return ok({ category });
  },
  { rateLimit: 'admin_sensitive_action', sameOrigin: true },
);
