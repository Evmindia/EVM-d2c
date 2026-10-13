import { NextResponse } from 'next/server';
import { route } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { requireOrderStaff } from '@/lib/auth/require-admin';
import { getOrderLabel } from '@/services/admin/admin.service';
import { isValidOrderNumber } from '@/services/orders/order-number';
import { recordAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/orders/[reference]/label — download the stored shipping-label
 * PDF for an order. Staff-gated; the label lives in server-only Storage and is
 * never publicly accessible. 404 when no label exists (e.g. placeholder AWB).
 */
export const GET = route(
  async ({ req, requestId }) => {
    const principal = await requireOrderStaff(req);
    const parts = req.nextUrl.pathname.split('/').filter(Boolean);
    // .../orders/[reference]/label  → reference is the second-to-last segment.
    const ref = parts[parts.length - 2] ?? '';
    if (!isValidOrderNumber(ref)) throw new AppError('not_found');

    const pdf = await getOrderLabel(ref);

    await recordAudit({
      action: 'order.view',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'order',
      resourceId: ref,
      requestId,
      metadata: { event: 'label_download' },
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="label-${ref}.pdf"`,
        'cache-control': 'no-store',
      },
    });
  },
  { rateLimit: 'admin_read' },
);
