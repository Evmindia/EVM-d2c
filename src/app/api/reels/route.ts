import { route, ok } from '@/app/api/_lib/handler';
import { listPublicReels } from '@/services/reels/reels.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/reels — Public endpoint returning active brand reels for the storefront.
 */
export const GET = route(
  async () => {
    const reels = await listPublicReels();
    return ok({ reels });
  },
  { rateLimit: 'public' }
);
