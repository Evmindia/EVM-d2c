'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

/**
 * Client-side gate for account pages. This is UX only — the proxy redirects
 * unauthenticated page requests and every /api/account endpoint independently
 * verifies the session server-side (defense in depth).
 */
export function AccountGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/account');
  }, [loading, user, router]);

  if (loading || !user) {
    return <p className="text-sm text-gray-600">Loading…</p>;
  }
  return <>{children}</>;
}
