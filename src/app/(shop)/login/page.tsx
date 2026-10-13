'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { PhoneOtpLogin } from '@/components/auth/PhoneOtpLogin';
import { Logo } from '@/components/ui/Logo';

/**
 * Public storefront login — PHONE OTP ONLY. Email/password sign-in is for staff
 * and lives at /staff-login (customers never see it here).
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-16" />}>
      <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center bg-gradient-to-b from-neutral-50 via-white to-neutral-100/60 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200/90 bg-white p-7 shadow-xl shadow-neutral-900/5 sm:p-9">
          <div className="mb-6 flex flex-col items-center text-center border-b border-neutral-100 pb-5">
            <Logo href="/" height={32} variant="dark" />
            <h1 className="mt-4 text-xl font-bold text-neutral-900">Sign in to EVM</h1>
            <p className="mt-1 text-xs text-neutral-500 max-w-xs">
              Access your orders, profile, and saved delivery addresses with a quick SMS OTP.
            </p>
          </div>

          <PhoneOtpLogin />

          <div className="mt-6 border-t border-neutral-100 pt-4 text-center">
            <p className="text-xs text-neutral-500">
              Shopping without signing in?{' '}
              <Link href="/cart" className="font-semibold text-neutral-900 underline hover:text-black">
                Go to Cart
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
