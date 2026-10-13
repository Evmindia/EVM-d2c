'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';

/**
 * Header profile entry: a white person icon linking to the account area when
 * signed in, otherwise to login. Styled for the dark header.
 */
export function AccountNav() {
  const { user, loading } = useAuth();

  if (loading) {
    return <span className="block h-10 w-10 animate-pulse rounded-full bg-white/20" aria-hidden="true" />;
  }

  return (
    <Link
      href={user ? '/account' : '/login'}
      aria-label={user ? 'Your account' : 'Log in'}
      title={user?.displayName || user?.email || (user ? 'Account' : 'Log in')}
      className="flex h-10 w-10 items-center justify-center text-white/90 transition hover:text-white"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    </Link>
  );
}
