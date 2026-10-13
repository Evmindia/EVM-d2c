import { route, ok } from '@/app/api/_lib/handler';
import { listPublicCategories } from '@/services/catalog/category.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/categories — public active categories (public DTO). Rate-limited. */
export const GET = route(
  async () => {
    const categories = await listPublicCategories();
    return ok({ categories });
  },
  { rateLimit: 'public' },
);
