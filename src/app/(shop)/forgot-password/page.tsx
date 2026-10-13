'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { useAuth } from '@/components/auth/AuthProvider';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    // Always show the same generic result — never reveal whether the email
    // is registered (anti-enumeration). Firebase sends the actual reset email.
    await resetPassword(email.trim());
    setBusy(false);
    setDone(true);
  }

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold text-gray-900">Reset password</h1>
        <p className="mt-1 text-xs text-gray-500">
          Enter the email address associated with your account to receive a password reset link.
        </p>

        {done ? (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50/70 p-4 text-xs text-green-900">
            <p className="font-medium">Check your inbox</p>
            <p className="mt-1 leading-relaxed text-green-800">
              If an account exists for that email, a password reset link has been sent. Please check your inbox and spam folders.
            </p>
            <div className="mt-4 pt-2 border-t border-green-200/60">
              <Link href="/login" className="font-semibold underline hover:text-green-950">
                Return to login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
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
            <button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-md bg-gray-900 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-xs">
              <Link href="/login" className="text-gray-600 underline hover:text-gray-900">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </Container>
  );
}
