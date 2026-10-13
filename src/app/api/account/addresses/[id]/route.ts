import { route, ok } from '@/app/api/_lib/handler';
import { requireUser } from '@/lib/auth/require-auth';
import { parseJsonBody, validate } from '@/lib/security/validate';
import { docIdSchema } from '@/lib/validation/catalog';
import { addressUpdateSchema } from '@/lib/validation/address';
import { updateAddress, deleteAddress } from '@/services/addresses/address.service';
import { recordAudit } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function addressIdFromPath(pathname: string): string {
  return validate(docIdSchema, pathname.split('/').filter(Boolean).pop());
}

/**
 * PATCH /api/account/addresses/[id] — update an address the caller owns.
 * Ownership is verified in the service (address.userId == verified uid) -> IDOR
 * on another user's address returns 404. userId reassignment is not possible.
 */
export const PATCH = route(
  async ({ req }) => {
    const principal = await requireUser(req);
    const id = addressIdFromPath(req.nextUrl.pathname);
    const input = await parseJsonBody(req, addressUpdateSchema);
    const address = await updateAddress(principal.uid, id, input);
    await recordAudit({
      action: 'user.role_change',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'address',
      resourceId: id,
      metadata: { event: 'address_update', fields: Object.keys(input) },
    });
    return ok({ address });
  },
  { rateLimit: 'auth_address_write', sameOrigin: true },
);

/** DELETE /api/account/addresses/[id] — delete an address the caller owns. */
export const DELETE = route(
  async ({ req }) => {
    const principal = await requireUser(req);
    const id = addressIdFromPath(req.nextUrl.pathname);
    await deleteAddress(principal.uid, id);
    await recordAudit({
      action: 'user.role_change',
      actorUid: principal.uid,
      actorRole: principal.role,
      resourceType: 'address',
      resourceId: id,
      metadata: { event: 'address_delete' },
    });
    return ok({ id, deleted: true });
  },
  { rateLimit: 'auth_address_write', sameOrigin: true },
);
