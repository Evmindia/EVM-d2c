import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { trackShipment } from '@/lib/eshipz/tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/shipping/track?awb=<awb>&carrier=<slug> — public shipment status by
 * AWB. Returns only status/date fields (no PII). `carrier` is optional (the
 * carrier eShipz chose, stored on the order). When eShipz is not configured,
 * tracking throws not_implemented (501).
 */
const querySchema = z.object({
  awb: z.string().regex(/^[A-Za-z0-9-]{6,30}$/),
  carrier: z.string().trim().max(40).optional(),
});

export const GET = route(
  async ({ req }) => {
    const parsed = querySchema.safeParse({
      awb: req.nextUrl.searchParams.get('awb') ?? '',
      carrier: req.nextUrl.searchParams.get('carrier') ?? undefined,
    });
    if (!parsed.success) {
      throw new AppError('bad_request', { internal: 'invalid awb' });
    }
    const r = await trackShipment(parsed.data.awb, parsed.data.carrier);
    return ok({
      awbNumber: r.awbNumber,
      status: r.status,
      statusType: r.statusCode,
      statusDate: r.statusDate,
      expectedDeliveryDate: r.expectedDeliveryDate,
      delivered: r.delivered,
    });
  },
  { rateLimit: 'search' },
);
