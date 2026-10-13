import { route, ok } from '@/app/api/_lib/handler';
import { requireAdmin } from '@/lib/auth/require-admin';
import { requirePermission } from '@/lib/auth/require-permission';
import { parseJsonBody } from '@/lib/security/validate';
import { categoryCreateSchema } from '@/lib/validation/catalog';
import { adminListCategories, createCategory } from '@/services/catalog/category.service';
import { recordAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/categories — list all categories (admin). */
export const GET = route(
  async ({ req }) => {
    await requireAdmin(req);
    const categories = await adminListCategories();
    return ok({ categories });
  },
  { rateLimit: 'admin_read' },
);

/** POST /api/admin/categories — create category (admin + products:write). */
export const POST = route(
  async ({ req, requestId }) => {
    const principal = await requirePermission(req, 'products:write');
    const input = await parseJsonBody(req, categoryCreateSchema);
    const category = await createCategory(input);
    await recordAudit({
      action: 'category.create',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'category',
      resourceId: category.id,
      requestId,
      metadata: { slug: category.slug },
    });
    return ok({ category }, { status: 201 });
  },
  { rateLimit: 'admin_write', sameOrigin: true },
);
