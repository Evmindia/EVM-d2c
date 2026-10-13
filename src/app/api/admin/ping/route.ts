import { route, ok } from '@/app/api/_lib/handler';
import { authenticate } from '@/lib/security/auth';
import { requireAdmin } from '@/lib/security/authorize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Example admin-guarded endpoint proving the authorization chain end to end:
 *   1. middleware pre-filters (must present a credential),
 *   2. handler verifies the Firebase token server-side (authenticate),
 *   3. handler checks the admin role server-side (requireAdmin).
 * A customer token reaches step 3 and is rejected with a safe 403. No admin
 * data is returned; this only confirms authorization works.
 */
export const GET = route(
  async ({ req }) => {
    const principal = await authenticate(req);
    requireAdmin(principal);
    return ok({ pong: true, role: principal.role });
  },
  { rateLimit: 'admin' },
);
