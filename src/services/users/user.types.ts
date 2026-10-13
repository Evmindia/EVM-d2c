/**
 * User profile types. The Firebase Auth user is the authentication source of
 * truth; this Firestore profile stores APPLICATION data only. It NEVER stores
 * passwords, hashes, tokens, or refresh tokens.
 *
 * Server-controlled fields (uid, email, emailVerified, isActive, createdAt,
 * lastLoginAt) are only written by trusted server code. There is no `role` field
 * here — authorization uses Firebase custom claims, so a profile document can
 * never grant admin.
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

/** Fields a customer may edit. */
export interface EditableProfile {
  displayName?: string;
  phone?: string;
}

/** Customer-facing profile DTO (allow-listed). */
export interface PublicProfile {
  email: string;
  displayName: string;
  phone: string;
  emailVerified: boolean;
  createdAt: string;
}
