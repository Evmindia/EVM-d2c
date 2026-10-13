'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';

const TABS = [
  { href: '/account', label: 'Overview' },
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/addresses', label: 'Addresses' },
];

/** Shared account navigation + logout. */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  async function onLogout() {
    await logout();
    router.replace('/');
  }

  const currentTab = TABS.find((t) => t.href === pathname);
  const breadcrumbItems = [
    { name: 'Home', path: '/' },
    { name: 'My Account', path: '/account' },
    ...(pathname !== '/account' && currentTab ? [{ name: currentTab.label, path: currentTab.href }] : []),
  ];

  return (
    <div>
      <Breadcrumbs items={breadcrumbItems} className="mb-4" />
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <nav
          aria-label="Account"
          className="flex min-w-0 items-center gap-1 overflow-x-auto pb-1 text-sm sm:pb-0"
        >
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={onLogout}
          className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Log out
        </button>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
