import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { requireAdmin } from '@/lib/auth/require-admin';
import { validate } from '@/lib/security/validate';
import { z } from 'zod';
import { getAdminPayment } from '@/services/admin/admin.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const orderRefSchema = z.string().trim().regex(/^EVM-[0-9A-HJKMNP-TV-Z]{8}$/, 'invalid order');

/**
 * GET /api/admin/payments?order=EVM-XXXXXXXX — VIEW-ONLY safe payment info.
 *
 * There is NO write here: no "mark paid", no capture, no refund, no amount/
 * provider edit. Payment state is owned solely by the payment service. Returns
 * the AdminPayment DTO — never Razorpay secrets, webhook secret, or raw payload.
 */
export const GET = route(
  async ({ req }) => {
    await requireAdmin(req);
    const order = validate(orderRefSchema, req.nextUrl.searchParams.get('order') ?? undefined);
    const payment = await getAdminPayment(order);
    if (!payment) throw new AppError('not_found');
    return ok(payment);
  },
  { rateLimit: 'admin_read' },
);
