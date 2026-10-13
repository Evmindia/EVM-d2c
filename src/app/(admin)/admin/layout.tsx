import type { Metadata } from 'next';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminNav } from '@/components/admin/AdminNav';

/**
 * Admin shell. Hardened as a primary attack target:
 * - noindex/nofollow (plus X-Robots-Tag from the proxy).
 * - Access is enforced by the proxy (credential pre-filter), a client AdminGuard
 *   (UX only), AND — the real boundary — every /api/admin route verifying the
 *   Firebase session + admin role/permission server-side. UI hiding is never
 *   authorization.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Admin',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">EVM Admin</span>
          </div>
          <div className="mt-3">
            <AdminNav />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <AdminGuard>{children}</AdminGuard>
      </main>
    </div>
  );
}
