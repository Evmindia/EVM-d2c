'use client';

import Link from 'next/link';

export default function AccountOverviewPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Manage your profile, orders, and saved addresses.</p>
      <ul className="grid gap-3 sm:grid-cols-3">
        {[
          { href: '/account/profile', label: 'Profile', desc: 'Name and phone' },
          { href: '/account/orders', label: 'Orders', desc: 'Your order history' },
          { href: '/account/addresses', label: 'Addresses', desc: 'Saved delivery addresses' },
        ].map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="block rounded-lg border border-gray-200 p-4 hover:shadow-sm"
            >
              <span className="text-sm font-semibold text-gray-900">{c.label}</span>
              <span className="mt-1 block text-xs text-gray-500">{c.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
