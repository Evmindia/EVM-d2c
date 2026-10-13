'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, authErrorMessage } from './AuthProvider';

/**
 * Email + password login. Used for STAFF/ADMIN sign-in (the public storefront
 * login is phone-OTP only). `defaultNext` is where to go on success when no safe
 * `?next=` is present.
 */
export function EmailPasswordLogin({ defaultNext = '/account' }: { defaultNext?: string }) {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      const next = params.get('next');
      const isSafe =
        next &&
        (next.startsWith('/account') || next.startsWith('/admin')) &&
        !next.startsWith('//') &&
        !next.includes('\\');
      router.push(isSafe ? next : defaultNext);
    } catch (err) {
      setError(authErrorMessage(err, 'login'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-xs text-red-700">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-xs font-medium text-gray-700">
          Password
        </label>
        <div className="relative mt-1">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 pr-16 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="h-11 w-full rounded-md bg-gray-900 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {busy ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  );
}
