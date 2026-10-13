import 'server-only';

/**
 * Saved address service — server-only. The `user_addresses` collection denies
 * all client access; ownership is enforced here using the VERIFIED uid (never a
 * body-supplied userId). Address ids are Firestore auto-ids (unguessable). Every
 * read/update/delete re-checks that the document's userId matches the caller —
 * the core IDOR guard.
 */
import type { DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { AppError } from '@/lib/security/errors';
import type { AddressCreateInput, AddressUpdateInput } from '@/lib/validation/address';

const COLLECTION = 'user_addresses';

export interface SavedAddress {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

function docToAddress(id: string, d: DocumentData): SavedAddress {
  return {
    id,
    fullName: String(d.fullName ?? ''),
    phone: String(d.phone ?? ''),
    addressLine1: String(d.addressLine1 ?? ''),
    ...(d.addressLine2 ? { addressLine2: String(d.addressLine2) } : {}),
    ...(d.landmark ? { landmark: String(d.landmark) } : {}),
    city: String(d.city ?? ''),
    state: String(d.state ?? ''),
    postalCode: String(d.postalCode ?? ''),
    country: String(d.country ?? 'IN'),
    isDefault: Boolean(d.isDefault),
    createdAt: String(d.createdAt ?? ''),
    updatedAt: String(d.updatedAt ?? ''),
  };
}

const MAX_ADDRESSES = 20;

export async function listAddresses(uid: string): Promise<SavedAddress[]> {
  const snap = await adminDb()
    .collection(COLLECTION)
    .where('userId', '==', uid)
    .limit(MAX_ADDRESSES)
    .get();
  return snap.docs
    .map((d) => docToAddress(d.id, d.data()))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

/** Load an address ONLY if it belongs to the caller; else not_found (IDOR guard). */
async function getOwned(uid: string, id: string): Promise<{ ref: FirebaseFirestore.DocumentReference; data: DocumentData }> {
  const docRef = adminDb().collection(COLLECTION).doc(id);
  const snap = await docRef.get();
  if (!snap.exists || snap.get('userId') !== uid) {
    throw new AppError('not_found');
  }
  return { ref: docRef, data: snap.data()! };
}

async function unsetOtherDefaults(uid: string, exceptId?: string): Promise<void> {
  const snap = await adminDb().collection(COLLECTION).where('userId', '==', uid).where('isDefault', '==', true).get();
  const batch = adminDb().batch();
  for (const d of snap.docs) {
    if (d.id !== exceptId) batch.set(d.ref, { isDefault: false }, { merge: true });
  }
  await batch.commit();
}

export async function createAddress(uid: string, input: AddressCreateInput): Promise<SavedAddress> {
  const count = (await adminDb().collection(COLLECTION).where('userId', '==', uid).count().get()).data().count;
  if (count >= MAX_ADDRESSES) {
    throw new AppError('bad_request', { internal: 'address limit reached' });
  }
  const now = new Date().toISOString();
  const { isDefault, ...rest } = input;
  const docRef = adminDb().collection(COLLECTION).doc();
  // userId is set from the VERIFIED uid, never from the input.
  await docRef.set({ ...rest, userId: uid, isDefault: Boolean(isDefault), createdAt: now, updatedAt: now });
  if (isDefault) await unsetOtherDefaults(uid, docRef.id);
  return docToAddress(docRef.id, (await docRef.get()).data()!);
}

export async function updateAddress(
  uid: string,
  id: string,
  input: AddressUpdateInput,
): Promise<SavedAddress> {
  const { ref } = await getOwned(uid, id);
  const patch: Record<string, unknown> = { ...input, updatedAt: new Date().toISOString() };
  // Never allow userId reassignment.
  delete patch.userId;
  await ref.set(patch, { merge: true });
  if (input.isDefault) await unsetOtherDefaults(uid, id);
  return docToAddress(id, (await ref.get()).data()!);
}

export async function deleteAddress(uid: string, id: string): Promise<void> {
  const { ref } = await getOwned(uid, id);
  await ref.delete();
}
