'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { useAuth, authErrorMessage } from '@/components/auth/AuthProvider';

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Please choose a password with at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await signup(name.trim(), email, password);
      router.push('/account');
    } catch (err) {
      setError(authErrorMessage(err, 'signup'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold text-gray-900">Create account</h1>
        <p className="mt-1 text-xs text-gray-500">Optional — you can also check out as a guest.</p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {error && (
            <p role="alert" className="rounded-md bg-red-50 p-3 text-xs text-red-700">
              {error}
            </p>
          )}
          <Input
            id="name"
            label="Full name"
            value={name}
            onChange={setName}
            autoComplete="name"
            required
          />
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-700">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 pr-16 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">Must be at least 8 characters long.</p>
          </div>
          <div>
            <label htmlFor="confirm" className="block text-xs font-medium text-gray-700">
              Confirm password
            </label>
            <div className="relative mt-1">
              <input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 pr-16 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-md bg-gray-900 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="underline hover:text-gray-900 font-medium">
            Log in
          </Link>
        </p>
      </div>
    </Container>
  );
}

function Input({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
      />
    </div>
  );
}
