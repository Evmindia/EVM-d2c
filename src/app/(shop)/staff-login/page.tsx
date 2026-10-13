'use client';

import { Suspense } from 'react';
import { Container } from '@/components/ui/Container';
import { EmailPasswordLogin } from '@/components/auth/EmailPasswordLogin';
import { Logo } from '@/components/ui/Logo';

/**
 * Staff / admin sign-in (email + password). Separate from the customer login
 * (which is phone-OTP only). On success, defaults to the admin area.
 */
export default function StaffLoginPage() {
  return (
    <Suspense fallback={<div className="py-12" />}>
      <Container className="py-12">
        <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex justify-center">
            <Logo href="/" height={32} variant="dark" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Staff login</h1>
          <p className="mt-1 text-xs text-gray-500">Admin access — email and password.</p>
          <div className="mt-6">
            <EmailPasswordLogin defaultNext="/admin" />
          </div>
        </div>
      </Container>
    </Suspense>
  );
}
