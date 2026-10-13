import 'server-only';

/**
 * Staff management service — Superadmin operations.
 *
 * Manages privileged staff accounts across Superadmins, Admins, and Dispatch/Warehouse team.
 * Controls Firebase Authentication user records, custom claims (role & fine-grained permissions),
 * and persists staff profiles in the server-only `admin_users` Firestore collection.
 */
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { AppError } from '@/lib/security/errors';
import { recordAudit } from '@/lib/audit/audit';
import type { Role, Permission, Principal } from '@/types/domain';

const COLLECTION = 'admin_users';

export interface StaffMember {
  uid: string;
  email: string;
  displayName: string;
  role: 'superadmin' | 'admin' | 'warehouse';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastLoginAt?: string;
}

export interface CreateStaffInput {
  email: string;
  password: string;
  displayName?: string;
  role: 'superadmin' | 'admin' | 'warehouse';
}

export interface UpdateStaffInput {
  role?: 'superadmin' | 'admin' | 'warehouse';
  isActive?: boolean;
  password?: string;
  displayName?: string;
}

export function getPermissionsForRole(role: Role): Permission[] {
  switch (role) {
    case 'superadmin':
      return [
        'orders:read',
        'orders:update',
        'orders:cancel',
        'payments:read',
        'refunds:create',
        'coupons:create',
        'products:write',
        'inventory:write',
        'users:manage',
        'roles:manage',
      ];
    case 'admin':
      return [
        'orders:read',
        'orders:update',
        'orders:cancel',
        'payments:read',
        'products:write',
        'inventory:write',
      ];
    case 'warehouse':
      return ['orders:read', 'orders:update'];
    default:
      return [];
  }
}

/**
 * List all staff members.
 * Automatically synchronizes any Firebase Auth user with a privileged role claim
 * who may not yet have a record in the `admin_users` Firestore collection.
 */
export async function listStaffMembers(): Promise<StaffMember[]> {
  const db = adminDb();
  const auth = adminAuth();

  const snap = await db.collection(COLLECTION).get();
  const staffMap = new Map<string, StaffMember>();

  snap.forEach((doc) => {
    const d = doc.data();
    staffMap.set(doc.id, {
      uid: doc.id,
      email: String(d.email || ''),
      displayName: String(d.displayName || ''),
      role: (d.role === 'superadmin' || d.role === 'admin' || d.role === 'warehouse' ? d.role : 'admin'),
      isActive: d.isActive !== false,
      createdAt: String(d.createdAt || ''),
      updatedAt: String(d.updatedAt || ''),
      createdBy: d.createdBy ? String(d.createdBy) : undefined,
      lastLoginAt: d.lastLoginAt ? String(d.lastLoginAt) : undefined,
    });
  });

  // Sync existing Firebase Auth users who have custom claims
  try {
    const listResult = await auth.listUsers(100);
    for (const u of listResult.users) {
      const claims = (u.customClaims || {}) as { role?: string };
      if (claims.role === 'superadmin' || claims.role === 'admin' || claims.role === 'warehouse') {
        const existing = staffMap.get(u.uid);
        if (!existing) {
          const now = new Date().toISOString();
          const synced: StaffMember = {
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || u.email?.split('@')[0] || 'Staff',
            role: claims.role,
            isActive: !u.disabled,
            createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).toISOString() : now,
            updatedAt: now,
            lastLoginAt: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).toISOString() : undefined,
          };
          // Persist to admin_users collection so it stays synced
          await db.collection(COLLECTION).doc(u.uid).set(synced, { merge: true });
          staffMap.set(u.uid, synced);
        } else if (u.metadata.lastSignInTime) {
          existing.lastLoginAt = new Date(u.metadata.lastSignInTime).toISOString();
        }
      }
    }
  } catch {
    /* ignore sync failures, return firestore data */
  }

  const list = Array.from(staffMap.values());
  const roleWeight: Record<string, number> = { superadmin: 1, admin: 2, warehouse: 3 };
  list.sort((a, b) => (roleWeight[a.role] ?? 9) - (roleWeight[b.role] ?? 9));
  return list;
}

export function assertPasswordPolicy(password: string): void {
  const missing: string[] = [];
  if (!password || password.length < 10) missing.push('at least 10 characters');
  if (!/[A-Z]/.test(password)) missing.push('an uppercase letter (A-Z)');
  if (!/[a-z]/.test(password)) missing.push('a lowercase letter (a-z)');
  if (!/[0-9]/.test(password)) missing.push('a number (0-9)');
  if (!/[^A-Za-z0-9]/.test(password)) missing.push('a special character (e.g. !@#$%^&*)');

  if (missing.length > 0) {
    throw new AppError('validation_error', {
      internal: `Password does not meet security requirements. Missing: ${missing.join(', ')}.`,
    });
  }
}

async function safeAuthUpdate(uid: string, props: { password?: string; displayName?: string; disabled?: boolean }): Promise<void> {
  try {
    await adminAuth().updateUser(uid, props);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Missing password requirements') || msg.includes('PASSWORD_DOES_NOT_MEET_REQUIREMENTS')) {
      throw new AppError('validation_error', {
        internal: 'Password must be at least 10 characters and contain an uppercase letter, a lowercase letter, a number, and a special character.',
      });
    }
    throw new AppError('bad_request', { internal: msg });
  }
}

async function safeAuthCreate(props: { email: string; password: string; displayName?: string; emailVerified?: boolean }) {
  try {
    return await adminAuth().createUser(props);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Missing password requirements') || msg.includes('PASSWORD_DOES_NOT_MEET_REQUIREMENTS')) {
      throw new AppError('validation_error', {
        internal: 'Password must be at least 10 characters and contain an uppercase letter, a lowercase letter, a number, and a special character.',
      });
    }
    throw new AppError('bad_request', { internal: msg });
  }
}

/**
 * Create a new staff member (Superadmin, Admin, or Dispatch/Warehouse).
 */
export async function createStaffMember(
  input: CreateStaffInput,
  actor: Principal,
): Promise<StaffMember> {
  const auth = adminAuth();
  const db = adminDb();

  const email = input.email.trim().toLowerCase();
  const displayName = (input.displayName || '').trim();
  const role = input.role;

  if (!email || !email.includes('@')) {
    throw new AppError('validation_error', { internal: 'Valid email address is required' });
  }
  assertPasswordPolicy(input.password);
  if (role !== 'superadmin' && role !== 'admin' && role !== 'warehouse') {
    throw new AppError('validation_error', { internal: 'Invalid staff role specified' });
  }

  let uid: string;
  let isExistingAuthUser = false;

  try {
    const existingUser = await auth.getUserByEmail(email);
    uid = existingUser.uid;
    isExistingAuthUser = true;
    // Update existing user credentials & details
    await safeAuthUpdate(uid, {
      password: input.password,
      displayName: displayName || existingUser.displayName || undefined,
      disabled: false,
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    // User does not exist, create new
    const newUser = await safeAuthCreate({
      email,
      password: input.password,
      displayName: displayName || undefined,
      emailVerified: true,
    });
    uid = newUser.uid;
  }

  // Assign role and permissions via custom claims
  const permissions = getPermissionsForRole(role);
  await auth.setCustomUserClaims(uid, { role, permissions });

  const now = new Date().toISOString();
  const staffMember: StaffMember = {
    uid,
    email,
    displayName: displayName || email.split('@')[0] || 'Staff',
    role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.uid,
  };

  await db.collection(COLLECTION).doc(uid).set(staffMember, { merge: true });

  await recordAudit({
    action: 'staff.create',
    actorUid: actor.uid,
    actorRole: actor.role,
    resourceType: 'staff',
    resourceId: uid,
    metadata: {
      email,
      role,
      isExistingAuthUser,
      displayName: staffMember.displayName,
    },
  });

  return staffMember;
}

/**
 * Update an existing staff member (role, active status, password, displayName).
 */
export async function updateStaffMember(
  uid: string,
  input: UpdateStaffInput,
  actor: Principal,
): Promise<StaffMember> {
  const auth = adminAuth();
  const db = adminDb();

  // Safety checks against self-lockout
  if (actor.uid === uid) {
    if (input.isActive === false) {
      throw new AppError('bad_request', { internal: 'You cannot deactivate your own account' });
    }
    if (input.role && input.role !== 'superadmin') {
      throw new AppError('bad_request', { internal: 'You cannot demote your own superadmin role' });
    }
  }

  const ref = db.collection(COLLECTION).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError('not_found', { internal: `Staff user with UID ${uid} not found` });
  }

  const currentData = snap.data() as StaffMember;
  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  // 1. Password update
  if (input.password) {
    assertPasswordPolicy(input.password);
    await safeAuthUpdate(uid, { password: input.password });
  }

  // 2. Active status update
  if (input.isActive !== undefined) {
    patch.isActive = Boolean(input.isActive);
    await safeAuthUpdate(uid, { disabled: !input.isActive });
  }

  // 3. Display name update
  if (input.displayName !== undefined) {
    const trimmed = input.displayName.trim();
    patch.displayName = trimmed;
    await auth.updateUser(uid, { displayName: trimmed });
  }

  // 4. Role update
  if (input.role && input.role !== currentData.role) {
    if (input.role !== 'superadmin' && input.role !== 'admin' && input.role !== 'warehouse') {
      throw new AppError('validation_error', { internal: 'Invalid staff role specified' });
    }
    patch.role = input.role;
    const permissions = getPermissionsForRole(input.role);
    await auth.setCustomUserClaims(uid, { role: input.role, permissions });
  }

  await ref.set(patch, { merge: true });

  await recordAudit({
    action: 'staff.update',
    actorUid: actor.uid,
    actorRole: actor.role,
    resourceType: 'staff',
    resourceId: uid,
    metadata: {
      email: currentData.email,
      ...patch,
      passwordChanged: Boolean(input.password),
    },
  });

  const updatedSnap = await ref.get();
  const d = updatedSnap.data()!;
  return {
    uid,
    email: String(d.email || currentData.email),
    displayName: String(d.displayName || currentData.displayName),
    role: (d.role as StaffMember['role']),
    isActive: d.isActive !== false,
    createdAt: String(d.createdAt || currentData.createdAt),
    updatedAt: String(d.updatedAt || patch.updatedAt),
    createdBy: d.createdBy ? String(d.createdBy) : currentData.createdBy,
    lastLoginAt: currentData.lastLoginAt,
  };
}

/**
 * Delete a staff member.
 */
export async function deleteStaffMember(uid: string, actor: Principal): Promise<void> {
  if (actor.uid === uid) {
    throw new AppError('bad_request', { internal: 'You cannot delete your own account' });
  }

  const auth = adminAuth();
  const db = adminDb();

  const ref = db.collection(COLLECTION).doc(uid);
  const snap = await ref.get();
  const email = snap.exists ? snap.data()?.email : undefined;

  try {
    await auth.deleteUser(uid);
  } catch {
    /* user might already be deleted in auth */
  }

  await ref.delete();

  await recordAudit({
    action: 'staff.delete',
    actorUid: actor.uid,
    actorRole: actor.role,
    resourceType: 'staff',
    resourceId: uid,
    metadata: { email },
  });
}
