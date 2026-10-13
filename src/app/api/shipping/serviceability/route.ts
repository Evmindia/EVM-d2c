import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { checkServiceability } from '@/lib/eshipz/serviceability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/shipping/serviceability?pincode=NNNNNN — public delivery check for
 * the checkout pincode field. Returns only non-PII serviceability flags. When
 * BlueDart is not configured, the finder throws not_implemented (501).
 */
const querySchema = z.object({ pincode: z.string().regex(/^\d{6}$/) });

export const GET = route(
  async ({ req }) => {
    const parsed = querySchema.safeParse({ pincode: req.nextUrl.searchParams.get('pincode') ?? '' });
    if (!parsed.success) {
      throw new AppError('bad_request', { internal: 'invalid pincode' });
    }
    const r = await checkServiceability(parsed.data.pincode);
    return ok({
      pincode: r.pincode,
      serviceable: r.serviceable,
      prepaidAvailable: r.prepaidAvailable,
      codAvailable: r.codAvailable,
      areaCode: r.areaCode,
    });
  },
  { rateLimit: 'public' },
);
