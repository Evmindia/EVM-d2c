import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { slugSchema } from '@/lib/validation/catalog';
import { validate } from '@/lib/security/validate';
import { getPublicProductBySlug } from '@/services/catalog/product.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/products/[slug] — public single product.
 * Returns 404 for missing OR inactive products (no existence leak). Public DTO
 * only.
 */
export const GET = route(
  async ({ req }) => {
    const slug = validate(slugSchema, req.nextUrl.pathname.split('/').pop());
    const product = await getPublicProductBySlug(slug);
    if (!product) throw new AppError('not_found');
    return ok(product);
  },
  { rateLimit: 'public' },
);
