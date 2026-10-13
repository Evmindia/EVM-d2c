import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { requirePermission } from '@/lib/auth/require-permission';
import { parseJsonBody } from '@/lib/security/validate';
import { updateReel, deleteReel } from '@/services/reels/reels.service';
import { recordAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reelUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  handle: z.string().min(1).max(100).optional(),
  views: z.string().min(1).max(50).optional(),
  likes: z.number().int().nonnegative().optional(),
  shares: z.number().int().nonnegative().optional(),
  poster: z.string().min(1).optional(),
  videoUrl: z.string().optional(),
  product: z
    .object({
      name: z.string().min(1),
      image: z.string().min(1),
      price: z.number().positive(),
      mrp: z.number().positive(),
      discount: z.string().min(1),
      href: z.string().min(1),
    })
    .optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

function getIdFromUrl(pathname: string): string {
  return pathname.split('/').filter(Boolean).pop() ?? '';
}

/** PATCH /api/admin/reels/[id] — update brand reel fields or status. */
export const PATCH = route(
  async ({ req, requestId }) => {
    const principal = await requirePermission(req, 'products:write');
    const id = getIdFromUrl(req.nextUrl.pathname);
    if (!id) throw new AppError('bad_request', { internal: 'Missing reel id' });

    const input = await parseJsonBody(req, reelUpdateSchema);
    const updated = await updateReel(id, input);
    if (!updated) throw new AppError('not_found', { internal: 'Reel not found' });

    await recordAudit({
      action: 'content.reel.update',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'reel',
      resourceId: id,
      requestId,
      metadata: { updates: Object.keys(input) },
    });

    return ok({ reel: updated });
  },
  { rateLimit: 'admin_write', sameOrigin: true }
);

/** DELETE /api/admin/reels/[id] — delete a brand reel. */
export const DELETE = route(
  async ({ req, requestId }) => {
    const principal = await requirePermission(req, 'products:write');
    const id = getIdFromUrl(req.nextUrl.pathname);
    if (!id) throw new AppError('bad_request', { internal: 'Missing reel id' });

    await deleteReel(id);

    await recordAudit({
      action: 'content.reel.delete',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'reel',
      resourceId: id,
      requestId,
      metadata: { deleted: true },
    });

    return ok({ deleted: true });
  },
  { rateLimit: 'admin_write', sameOrigin: true }
);
