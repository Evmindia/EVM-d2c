import 'server-only';

/**
 * User profile service — server-only. All writes go through here (Firestore
 * rules deny client writes to users/{uid}). The uid ALWAYS comes from the
 * verified Firebase identity passed by the caller — never from a request body.
 */
import type { DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type { EditableProfile, PublicProfile, UserProfile } from './user.types';

const COLLECTION = 'users';

function ref(uid: string) {
  return adminDb().collection(COLLECTION).doc(uid);
}

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

export function toPublicProfile(p: UserProfile): PublicProfile {
  return {
    email: p.email,
    displayName: p.displayName,
    phone: p.phone,
    emailVerified: p.emailVerified,
    createdAt: p.createdAt,
  };
}

/**
 * Ensure a profile exists for a verified user; create it on first login/signup.
 * Server-controlled fields are set here from the verified identity only.
 * Updates emailVerified + lastLoginAt from the verified token on each call.
 */
export async function ensureProfile(identity: {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
}): Promise<UserProfile> {
  const now = new Date().toISOString();
  const docRef = ref(identity.uid);
  const snap = await docRef.get();

  if (!snap.exists) {
    const profile = {
      email: identity.email,
      displayName: identity.displayName ?? '',
      phone: '',
      emailVerified: identity.emailVerified,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };
    await docRef.set(profile);
    return docToProfile(identity.uid, profile);
  }

  // Refresh server-controlled auth-derived fields on login.
  await docRef.set(
    { emailVerified: identity.emailVerified, lastLoginAt: now, updatedAt: now, email: identity.email },
    { merge: true },
  );
  return docToProfile(identity.uid, { ...snap.data(), emailVerified: identity.emailVerified, lastLoginAt: now });
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await ref(uid).get();
  if (!snap.exists) return null;
  return docToProfile(uid, snap.data()!);
}

/**
 * Update ONLY the editable fields (displayName, phone). Any other field in the
 * input is ignored here (and rejected earlier by the strict schema), so a
 * customer can never change uid/email/role/isActive/emailVerified via this path.
 */
export async function updateProfile(uid: string, input: EditableProfile): Promise<UserProfile> {
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (input.displayName !== undefined) patch.displayName = input.displayName;
  if (input.phone !== undefined) patch.phone = input.phone;
  await ref(uid).set(patch, { merge: true });
  return (await getProfile(uid))!;
}
