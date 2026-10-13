import { route, ok } from '@/app/api/_lib/handler';
import { requireAdmin } from '@/lib/auth/require-admin';
import { requirePermission } from '@/lib/auth/require-permission';
import { parseJsonBody } from '@/lib/security/validate';
import { adminListReels, createReel } from '@/services/reels/reels.service';
import { recordAudit } from '@/lib/audit/audit';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reelInputSchema = z.object({
  title: z.string().min(1).max(200),
  handle: z.string().min(1).max(100),
  views: z.string().min(1).max(50),
  likes: z.number().int().nonnegative().optional().default(0),
  shares: z.number().int().nonnegative().optional().default(0),
  poster: z.string().min(1),
  videoUrl: z.string().optional(),
  product: z.object({
    name: z.string().min(1),
    image: z.string().min(1),
    price: z.number().positive(),
    mrp: z.number().positive(),
    discount: z.string().min(1),
    href: z.string().min(1),
  }),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

/** GET /api/admin/reels — list all brand reels (admin). */
export const GET = route(
  async ({ req }) => {
    await requireAdmin(req);
    const reels = await adminListReels();
    return ok({ reels });
  },
  { rateLimit: 'admin_read' }
);

/** POST /api/admin/reels — create a new brand reel (admin + products:write). */
export const POST = route(
  async ({ req, requestId }) => {
    const principal = await requirePermission(req, 'products:write');
    const input = await parseJsonBody(req, reelInputSchema);
    const reel = await createReel(input);

    await recordAudit({
      action: 'content.reel.create',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'reel',
      resourceId: reel.id,
      requestId,
      metadata: { title: reel.title, product: reel.product.name },
    });

    return ok({ reel }, { status: 201 });
  },
  { rateLimit: 'admin_write', sameOrigin: true }
);
