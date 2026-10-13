import 'server-only';

/**
 * User repository — admin-facing read queries. Bounded, allow-listed fields.
 * Never exposes passwords/tokens (none stored). Writes still go through
 * user.service (Firestore rules deny client writes to users/{uid}).
 */
import type { DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type { UserProfile } from './user.types';

const COLLECTION = 'users';

function docToProfile(uid: string, d: DocumentData): UserProfile {
  return {
    uid,
    email: String(d.email ?? ''),
    displayName: String(d.displayName ?? ''),
    phone: String(d.phone ?? ''),
    emailVerified: Boolean(d.emailVerified),
    isActive: d.isActive !== false,
    createdAt: String(d.createdAt ?? ''),
    updatedAt: String(d.updatedAt ?? ''),
    lastLoginAt: String(d.lastLoginAt ?? ''),
  };
}

export async function adminGetUser(uid: string): Promise<UserProfile | null> {
  const snap = await adminDb().collection(COLLECTION).doc(uid).get();
  if (!snap.exists) return null;
  return docToProfile(uid, snap.data()!);
}

export async function adminListUsers(limit: number): Promise<UserProfile[]> {
  const snap = await adminDb()
    .collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(Math.min(limit, 100))
    .get();
  return snap.docs.map((d) => docToProfile(d.id, d.data()));
}

/** Exact-match search on an allow-listed field (email or phone). Bounded. */
export async function adminFindUsers(
  field: 'email' | 'phone',
  value: string,
  limit = 20,
): Promise<UserProfile[]> {
  const snap = await adminDb()
    .collection(COLLECTION)
    .where(field, '==', value)
    .limit(Math.min(limit, 50))
    .get();
  return snap.docs.map((d) => docToProfile(d.id, d.data()));
}

/** Admin: set a customer's account active status (server-controlled field). */
export async function adminSetUserActive(uid: string, isActive: boolean): Promise<UserProfile | null> {
  const ref = adminDb().collection(COLLECTION).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.set({ isActive, updatedAt: new Date().toISOString() }, { merge: true });
  return docToProfile(uid, (await ref.get()).data()!);
}

export async function adminCountUsers(): Promise<number> {
  const agg = await adminDb().collection(COLLECTION).count().get();
  return agg.data().count;
}
