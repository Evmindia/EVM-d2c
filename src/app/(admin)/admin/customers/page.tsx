'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminData } from '@/components/admin/useAdminData';

interface CustomerRow {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  isActive: boolean;
  emailVerified: boolean;
}

export default function AdminCustomersPage() {
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('/api/admin/customers?limit=25');
  const { data, loading } = useAdminData<{ customers: CustomerRow[] }>(query);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Customers</h1>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(email ? `/api/admin/customers?email=${encodeURIComponent(email)}` : '/api/admin/customers?limit=25');
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Search by email"
          className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm"
        />
        <button type="submit" className="h-9 rounded-md bg-gray-900 px-3 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : !data || data.customers.length === 0 ? (
        <p className="text-sm text-gray-500">No customers found.</p>
      ) : (
        <ul className="divide-y divide-gray-100 text-sm">
          {data.customers.map((c) => (
            <li key={c.uid} className="flex items-center justify-between py-2">
              <div>
                <Link href={`/admin/customers/${c.uid}`} className="font-medium hover:underline">
                  {c.displayName || c.email}
                </Link>
                <span className="ml-2 text-gray-500">{c.email}</span>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs ${c.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {c.isActive ? 'active' : 'inactive'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
