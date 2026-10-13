import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { requireAdmin } from '@/lib/auth/require-admin';
import { requirePermission } from '@/lib/auth/require-permission';
import { parseJsonBody, validate } from '@/lib/security/validate';
import { z } from 'zod';
import { docIdSchema, productUpdateSchema, setActiveSchema } from '@/lib/validation/catalog';
import {
  adminGetProduct,
  updateProduct,
  setProductActive,
} from '@/services/catalog/product.service';
import { recordAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function idFromPath(pathname: string): string {
  const id = pathname.split('/').filter(Boolean).pop();
  return validate(docIdSchema, id);
}

/** GET /api/admin/products/[id] — full internal product (admin). */
export const GET = route(
  async ({ req }) => {
    await requireAdmin(req);
    const id = idFromPath(req.nextUrl.pathname);
    const product = await adminGetProduct(id);
    if (!product) throw new AppError('not_found');
    return ok({ product });
  },
  { rateLimit: 'admin_read' },
);

// Update accepts an optional expectedUpdatedAt for optimistic concurrency.
const patchSchema = z
  .object({ expectedUpdatedAt: z.string().max(40).optional() })
  .passthrough();

/** PATCH /api/admin/products/[id] — update (admin + products:write, concurrency). */
export const PATCH = route(
  async ({ req, requestId }) => {
    const principal = await requirePermission(req, 'products:write');
    const id = idFromPath(req.nextUrl.pathname);
    // Pull expectedUpdatedAt out, validate the rest against the strict product schema.
    const raw = await parseJsonBody(req, patchSchema);
    const { expectedUpdatedAt, ...rest } = raw as { expectedUpdatedAt?: string };
    const input = validate(productUpdateSchema, rest);

    const { product, priceChange } = await updateProduct(id, input, { expectedUpdatedAt });

    await recordAudit({
      action: priceChange.changed ? 'product.price_change' : 'product.update',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'product',
      resourceId: id,
      requestId,
      metadata: priceChange.changed
        ? {
            fields: Object.keys(input),
            priceFrom: priceChange.priceFrom,
            priceTo: priceChange.priceTo,
            mrpFrom: priceChange.mrpFrom,
            mrpTo: priceChange.mrpTo,
            discountFrom: priceChange.discountFrom,
            discountTo: priceChange.discountTo,
          }
        : { fields: Object.keys(input) },
    });
    return ok({ product });
  },
  { rateLimit: 'admin_sensitive_action', sameOrigin: true },
);

/** POST /api/admin/products/[id] — activate/deactivate (admin + products:write). */
export const POST = route(
  async ({ req, requestId }) => {
    const principal = await requirePermission(req, 'products:write');
    const id = idFromPath(req.nextUrl.pathname);
    const { isActive } = await parseJsonBody(req, setActiveSchema);
    await setProductActive(id, isActive);
    await recordAudit({
      action: isActive ? 'product.activate' : 'product.deactivate',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'product',
      resourceId: id,
      requestId,
      metadata: { isActive },
    });
    return ok({ id, isActive });
  },
  { rateLimit: 'admin_sensitive_action', sameOrigin: true },
);
