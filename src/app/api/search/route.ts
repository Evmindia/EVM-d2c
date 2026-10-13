import { route, ok } from '@/app/api/_lib/handler';
import { parseQuery } from '@/lib/security/validate';
import { searchQuerySchema } from '@/lib/validation/catalog';
import { searchProducts } from '@/services/catalog/search.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/search — public catalog search.
 * Query is Zod-validated (bounded length, safe charset) and tokenized
 * server-side; only fixed indexed Firestore queries are built (no injection).
 * Rate-limited under the stricter `search` policy. Active-only, public DTO.
 */
export const GET = route(
  async ({ req }) => {
    const { q, limit } = parseQuery(req, searchQuerySchema);
    const items = await searchProducts(q, limit ?? 20);
    return ok({ items, query: q });
  },
  { rateLimit: 'search' },
);
