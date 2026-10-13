import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Address service tests with a minimal in-memory Firestore mock. Focus: the uid
 * is taken from the caller (verified), never the input; ownership is enforced on
 * read/update/delete (IDOR -> not_found); userId can't be reassigned.
 */
type Doc = Record<string, unknown>;
const store = new Map<string, Doc>();
let seq = 0;

function snap(id: string) {
  return {
    id,
    exists: store.has(id),
    data: () => store.get(id),
    get: (f: string) => store.get(id)?.[f],
    ref: docRef(id),
  };
}
function docRef(id: string) {
  return {
    id,
    get: async () => snap(id),
    set: async (d: Doc, opts?: { merge?: boolean }) => {
      store.set(id, opts?.merge ? { ...(store.get(id) ?? {}), ...d } : { ...d });
    },
    delete: async () => {
      store.delete(id);
    },
  };
}
function query(filters: [string, string, unknown][]) {
  const match = () =>
    [...store.entries()].filter(([, d]) => filters.every(([f, , v]) => d[f] === v));
  const builder = {
    where: (f: string, op: string, v: unknown) => query([...filters, [f, op, v]]),
    limit: () => builder,
    orderBy: () => builder,
    get: async () => ({ docs: match().map(([id]) => snap(id)) }),
    count: () => ({ get: async () => ({ data: () => ({ count: match().length }) }) }),
  };
  return builder;
}
const collection = () => ({
  doc: (id?: string) => docRef(id ?? `auto${++seq}`),
  where: (f: string, op: string, v: unknown) => query([[f, op, v]]),
});
const batch = () => {
  const ops: (() => Promise<void>)[] = [];
  return {
    set: (ref: { set: (d: Doc, o?: { merge?: boolean }) => Promise<void> }, d: Doc, o?: { merge?: boolean }) =>
      ops.push(() => ref.set(d, o)),
    commit: async () => {
      for (const op of ops) await op();
    },
  };
};

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: () => ({ collection, batch }),
}));

import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from '@/services/addresses/address.service';

const input = {
  fullName: 'Asha', phone: '9876543210', addressLine1: '12 MG Road',
  city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'IN' as const, isDefault: false,
};

beforeEach(() => {
  store.clear();
  seq = 0;
});

describe('address ownership + IDOR', () => {
  it('stores userId from the caller, ignoring anything else', async () => {
    const a = await createAddress('userA', { ...input });
    expect(store.get(a.id)!.userId).toBe('userA');
  });

  it('lists only the caller’s addresses', async () => {
    await createAddress('userA', { ...input });
    await createAddress('userB', { ...input });
    const forA = await listAddresses('userA');
    expect(forA).toHaveLength(1);
  });

  it('rejects updating another user’s address (IDOR -> not_found)', async () => {
    const a = await createAddress('userA', { ...input });
    await expect(updateAddress('attacker', a.id, { city: 'Hacked' })).rejects.toMatchObject({
      code: 'not_found',
    });
    // untouched
    expect(store.get(a.id)!.city).toBe('Bengaluru');
  });

  it('rejects deleting another user’s address (IDOR -> not_found)', async () => {
    const a = await createAddress('userA', { ...input });
    await expect(deleteAddress('attacker', a.id)).rejects.toMatchObject({ code: 'not_found' });
    expect(store.has(a.id)).toBe(true);
  });

  it('does not allow userId reassignment on update', async () => {
    const a = await createAddress('userA', { ...input });
    // Even if a userId sneaks into the patch object, the service deletes it.
    await updateAddress('userA', a.id, { city: 'Mysuru', userId: 'victim' } as never);
    expect(store.get(a.id)!.userId).toBe('userA');
    expect(store.get(a.id)!.city).toBe('Mysuru');
  });

  it('lets the owner update and delete their own address', async () => {
    const a = await createAddress('userA', { ...input });
    const upd = await updateAddress('userA', a.id, { city: 'Mumbai' });
    expect(upd.city).toBe('Mumbai');
    await deleteAddress('userA', a.id);
    expect(store.has(a.id)).toBe(false);
  });
});
