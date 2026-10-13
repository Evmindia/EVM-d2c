import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { requireSuperadmin } from '@/lib/auth/require-admin';
import { parseJsonBody } from '@/lib/security/validate';
import { listStaffMembers, createStaffMember } from '@/services/admin/staff.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128),
  displayName: z.string().max(100).optional(),
  role: z.enum(['superadmin', 'admin', 'warehouse']),
});

/**
 * GET /api/admin/staff — list all staff members (Superadmin only).
 */
export const GET = route(
  async ({ req }) => {
    await requireSuperadmin(req);
    const staff = await listStaffMembers();
    return ok({ staff });
  },
  { rateLimit: 'admin_read' }
);

/**
 * POST /api/admin/staff — create a new staff member (Superadmin only).
 */
export const POST = route(
  async ({ req }) => {
    const principal = await requireSuperadmin(req);
    const body = await parseJsonBody(req, createStaffSchema);
    const staff = await createStaffMember(body, principal);
    return ok({ staff }, { status: 201 });
  },
  { rateLimit: 'admin_write' }
);
