import { route, ok } from '@/app/api/_lib/handler';
import { requireUser } from '@/lib/auth/require-auth';
import { parseJsonBody } from '@/lib/security/validate';
import { addressCreateSchema } from '@/lib/validation/address';
import { listAddresses, createAddress } from '@/services/addresses/address.service';
import { recordAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/account/addresses — the caller's own saved addresses. */
export const GET = route(
  async ({ req }) => {
    const principal = await requireUser(req);
    const addresses = await listAddresses(principal.uid);
    return ok({ addresses });
  },
  { rateLimit: 'auth_account_read' },
);

/**
 * POST /api/account/addresses — create an address owned by the caller.
 * userId is taken from the verified identity; any userId in the body is rejected
 * by the strict schema and never used.
 */
export const POST = route(
  async ({ req }) => {
    const principal = await requireUser(req);
    const input = await parseJsonBody(req, addressCreateSchema);
    const address = await createAddress(principal.uid, input);
    await recordAudit({
      action: 'user.role_change',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'address',
      resourceId: address.id,
      metadata: { event: 'address_create' },
    });
    return ok({ address }, { status: 201 });
  },
  { rateLimit: 'auth_address_write', sameOrigin: true },
);
