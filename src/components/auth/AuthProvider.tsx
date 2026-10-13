'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { clientAuth } from '@/lib/firebase/client';

/**
 * Client auth context (Firebase JS SDK).
 *
 * Session model: the Firebase SDK manages its own session in its secure default
 * store (IndexedDB) purely to obtain ID tokens; it is NOT our server auth. After
 * sign-in we exchange the ID token at /api/auth/session for an httpOnly session
 * cookie, which is the authoritative server session. We never place raw tokens
 * in localStorage ourselves. Errors are mapped to generic messages to limit
 * account enumeration.
 */
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /** Send a login OTP SMS (via our Kapsystem gateway). */
  sendPhoneOtp: (phone: string) => Promise<void>;
  /** Verify the OTP for `phone`; establishes the server session on success. */
  confirmPhoneOtp: (phone: string, code: string) => Promise<void>;
}


const AuthContext = createContext<AuthContextValue | null>(null);

async function postSession(idToken: string, mode: 'login' | 'signup', displayName?: string) {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken, mode, ...(displayName ? { displayName } : {}) }),
  });
  if (!res.ok) throw new Error('session');
}

/**
 * Best-effort guest -> user cart merge using the EXISTING /api/cart/merge
 * endpoint (transaction-safe, destination user derived from the verified
 * session — never client-chosen). No-op when there is no guest cart.
 */
async function mergeGuestCart() {
  try {
    await fetch('/api/cart/merge', { method: 'POST' });
  } catch {
    /* ignore: no guest cart or merge unavailable */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(clientAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(clientAuth(), email, password);
    await postSession(await cred.user.getIdToken(), 'login');
    await mergeGuestCart();
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(clientAuth(), email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    await postSession(await cred.user.getIdToken(true), 'signup', name);
    await mergeGuestCart();
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      await signOut(clientAuth());
    }
  }, []);

  const sendPhoneOtp = useCallback(async (phone: string) => {
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) throw new Error('otp/send-failed');
  }, []);

  const confirmPhoneOtp = useCallback(async (phone: string, code: string) => {
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    if (!res.ok) throw new Error('otp/invalid');
    const json = (await res.json()) as { data?: { customToken?: string } };
    const token = json.data?.customToken;
    if (!token) throw new Error('otp/invalid');
    const cred = await signInWithCustomToken(clientAuth(), token);
    await postSession(await cred.user.getIdToken(), 'login');
    await mergeGuestCart();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    // Apply our rate-limit/audit (generic response), then let Firebase send.
    await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    try {
      await sendPasswordResetEmail(clientAuth(), email);
    } catch {
      // Swallow to avoid revealing whether the email is registered.
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, resetPassword, sendPhoneOtp, confirmPhoneOtp }),
    [user, loading, login, signup, logout, resetPassword, sendPhoneOtp, confirmPhoneOtp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Map Firebase auth errors to generic, enumeration-safe messages. */
export function authErrorMessage(err: unknown, context: 'login' | 'signup' | 'reset'): string {
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
  if (context === 'signup' && code === 'auth/email-already-in-use') {
    return 'We couldn’t create this account. If you already have one, try logging in or resetting your password.';
  }
  if (context === 'signup' && code === 'auth/weak-password') {
    return 'Please choose a stronger password (at least 8 characters).';
  }
  if (context === 'login') {
    return 'Invalid email or password.';
  }
  return 'Something went wrong. Please try again.';
}
