import { route, ok } from '@/app/api/_lib/handler';
import { requireAdmin } from '@/lib/auth/require-admin';
import { parseQuery } from '@/lib/security/validate';
import { z } from 'zod';
import { listAdminCustomers, searchAdminCustomers } from '@/services/admin/admin.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allow-listed search fields only (email/phone). No arbitrary field/operator.
const querySchema = z
  .object({
    email: z.string().trim().toLowerCase().max(254).email().optional(),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, ''))
      .pipe(z.string().regex(/^(?:\+?91)?[6-9]\d{9}$/))
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    _: z.any().optional(),
  })
  .passthrough();

/** GET /api/admin/customers — list/search customers (admin). AdminCustomer DTO. */
export const GET = route(
  async ({ req }) => {
    await requireAdmin(req);
    const q = parseQuery(req, querySchema);
    if (q.email) return ok({ customers: await searchAdminCustomers('email', q.email) });
    if (q.phone) return ok({ customers: await searchAdminCustomers('phone', q.phone) });
    return ok({ customers: await listAdminCustomers(q.limit ?? 25) });
  },
  { rateLimit: 'admin_search' },
);
