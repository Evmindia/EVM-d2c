import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { AppError } from '@/lib/security/errors';
import { requireSuperadmin } from '@/lib/auth/require-admin';
import { parseJsonBody } from '@/lib/security/validate';
import { updateStaffMember, deleteStaffMember } from '@/services/admin/staff.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updateStaffSchema = z.object({
  role: z.enum(['superadmin', 'admin', 'warehouse']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(10).max(128).optional(),
  displayName: z.string().max(100).optional(),
});

function getUid(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  const uid = parts[parts.length - 1];
  if (!uid || uid === 'staff') {
    throw new AppError('validation_error', { internal: 'Staff UID is required' });
  }
  return uid;
}

/**
 * PATCH /api/admin/staff/[uid] — update role, status, or reset password (Superadmin only).
 */
export const PATCH = route(
  async ({ req }) => {
    const principal = await requireSuperadmin(req);
    const uid = getUid(req.nextUrl.pathname);
    const body = await parseJsonBody(req, updateStaffSchema);
    const staff = await updateStaffMember(uid, body, principal);
    return ok({ staff });
  },
  { rateLimit: 'admin_write' }
);

/**
 * DELETE /api/admin/staff/[uid] — remove staff member (Superadmin only).
 */
export const DELETE = route(
  async ({ req }) => {
    const principal = await requireSuperadmin(req);
    const uid = getUid(req.nextUrl.pathname);
    await deleteStaffMember(uid, principal);
    return ok({ success: true });
  },
  { rateLimit: 'admin_write' }
);
