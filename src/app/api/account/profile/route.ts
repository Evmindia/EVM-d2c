import { z } from 'zod';
import { route, ok } from '@/app/api/_lib/handler';
import { requireUser } from '@/lib/auth/require-auth';
import { parseJsonBody, safeText } from '@/lib/security/validate';
import {
  getProfile,
  ensureProfile,
  updateProfile,
  toPublicProfile,
} from '@/services/users/user.service';
import { recordAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/account/profile — the caller's own profile (auth required). */
export const GET = route(
  async ({ req }) => {
    const principal = await requireUser(req);
    const profile =
      (await getProfile(principal.uid)) ??
      (await ensureProfile({
        uid: principal.uid,
        email: principal.email ?? '',
        emailVerified: false,
      }));
    return ok(toPublicProfile(profile));
  },
  { rateLimit: 'auth_account_read' },
);

/**
 * PATCH /api/account/profile — update ONLY displayName / phone.
 *
 * The strict schema rejects any attempt to set role, permissions, uid,
 * emailVerified, isActive, or email (privilege-escalation / status manipulation
 * guard). Even if such fields were sent, the service writes only the two allowed
 * fields, and authorization uses Firebase custom claims (not this document).
 */
const patchSchema = z
  .object({
    displayName: safeText(120).optional(),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, ''))
      .pipe(z.string().regex(/^(?:\+?91)?[6-9]\d{9}$/, 'invalid phone'))
      .optional(),
  })
  .strict()
  .refine((v) => v.displayName !== undefined || v.phone !== undefined, 'no fields to update');

export const PATCH = route(
  async ({ req }) => {
    const principal = await requireUser(req);
    const input = await parseJsonBody(req, patchSchema);
    const profile = await updateProfile(principal.uid, input);
    await recordAudit({
      action: 'user.role_change', // generic profile-change audit; no role is changeable here
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'profile',
      resourceId: principal.uid,
      metadata: { event: 'profile_update', fields: Object.keys(input) },
    });
    return ok(toPublicProfile(profile));
  },
  { rateLimit: 'auth_profile_write', sameOrigin: true },
);
