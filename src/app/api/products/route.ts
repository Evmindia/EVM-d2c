import { route, ok } from '@/app/api/_lib/handler';
import { parseQuery } from '@/lib/security/validate';
import { productListQuerySchema } from '@/lib/validation/catalog';
import { listPublicProducts } from '@/services/catalog/product.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/products — public product listing.
 * Active-only, Zod-validated query, bounded pagination, public DTO only,
 * rate-limited. Internal fields are never returned (mapper allow-list).
 */
export const GET = route(
  async ({ req }) => {
    const query = parseQuery(req, productListQuerySchema);
    const result = await listPublicProducts({
      category: query.category,
      sort: query.sort ?? 'newest',
      limit: query.limit ?? 24,
      cursor: query.cursor,
    });
    return ok(result);
  },
  { rateLimit: 'public' },
);
