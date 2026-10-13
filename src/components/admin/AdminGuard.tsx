'use client';

import { useEffect, useState } from 'react';

interface AdminMe {
  uid: string;
  role: string;
  permissions: string[];
}

/**
 * Client gate for admin pages. This is UX only — every /api/admin endpoint
 * independently verifies admin authorization server-side (the real boundary).
 * It calls /api/admin/me (which 403s non-admins) to decide what to render.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading');

  useEffect(() => {
    let active = true;
    fetch('/api/admin/me', { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? 'ok' : 'denied'))
      .then((s) => active && setState(s as 'ok' | 'denied'))
      .catch(() => active && setState('denied'));
    return () => {
      active = false;
    };
  }, []);

  if (state === 'loading') return <p className="text-sm text-gray-600">Checking access…</p>;
  if (state === 'denied') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-base font-semibold text-red-900">Access denied</h2>
        <p className="mt-1 text-sm text-red-800">
          You do not have permission to access the admin area.
        </p>
        <a
          href="/staff-login?next=/admin"
          className="mt-3 inline-block rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
        >
          Staff login
        </a>
      </div>
    );
  }
  return <>{children}</>;
}

export type { AdminMe };
