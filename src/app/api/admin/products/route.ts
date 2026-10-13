import { route, ok } from '@/app/api/_lib/handler';
import { requireAdmin } from '@/lib/auth/require-admin';
import { requirePermission } from '@/lib/auth/require-permission';
import { parseJsonBody, parseQuery } from '@/lib/security/validate';
import { z } from 'zod';
import { productCreateSchema } from '@/lib/validation/catalog';
import {
  adminListProducts,
  createProduct,
  adminFindProductsBySku,
} from '@/services/catalog/product.service';
import { toPublicProduct } from '@/services/catalog/catalog.mappers';
import { recordAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const listQuery = z
  .object({
    sku: z.string().trim().max(64).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    _: z.any().optional(),
  })
  .passthrough();

/** GET /api/admin/products — list (admin) or search by SKU (allow-listed). */
export const GET = route(
  async ({ req }) => {
    await requireAdmin(req);
    const q = parseQuery(req, listQuery);
    if (q.sku) {
      const found = await adminFindProductsBySku(q.sku);
      return ok({ products: found });
    }
    const products = await adminListProducts(q.limit ?? 50);
    return ok({ products });
  },
  { rateLimit: 'admin_read' },
);

/** POST /api/admin/products — create (admin + products:write). */
export const POST = route(
  async ({ req, requestId }) => {
    const principal = await requirePermission(req, 'products:write');
    const input = await parseJsonBody(req, productCreateSchema);
    const product = await createProduct(input);
    await recordAudit({
      action: 'product.create',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'product',
      resourceId: product.id,
      requestId,
      metadata: { slug: product.slug, sku: product.sku },
    });
    return ok({ product: toPublicProduct(product) }, { status: 201 });
  },
  { rateLimit: 'admin_write', sameOrigin: true },
);
