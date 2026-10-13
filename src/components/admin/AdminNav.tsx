'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminData } from './useAdminData';

const TABS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/reels', label: 'Brand Reels' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/audit-logs', label: 'Audit logs' },
];

export function AdminNav() {
  const pathname = usePathname();
  const { data: me } = useAdminData<{ role: string }>('/api/admin/me');
  const isWarehouse = me?.role === 'warehouse';
  const isSuperadmin = me?.role === 'superadmin';

  const visibleTabs = isWarehouse
    ? [{ href: '/admin/orders', label: 'Orders & Dispatch' }]
    : isSuperadmin
    ? [...TABS, { href: '/admin/staff', label: 'Staff & Roles' }]
    : TABS;
  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-1 text-sm">
      {visibleTabs.map((t) => {
        const active = t.href === '/admin' ? pathname === '/admin' : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-md px-3 py-1.5 ${active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
