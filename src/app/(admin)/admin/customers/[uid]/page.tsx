'use client';

import { use, useState } from 'react';
import { useAdminData } from '@/components/admin/useAdminData';

interface AdminCustomer {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export default function AdminCustomerDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const { data, loading, error } = useAdminData<AdminCustomer>(
    `/api/admin/customers/${encodeURIComponent(uid)}`,
  );
  const [active, setActive] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-gray-600">Loading…</p>;
  if (error || !data) return <p className="text-sm text-gray-600">{error ?? 'Customer not found.'}</p>;

  const isActive = active ?? data.isActive;

  async function toggleActive(next: boolean) {
    if (!confirm(`${next ? 'Activate' : 'Deactivate'} this customer account?`)) return;
    setMsg(null);
    const res = await fetch(`/api/admin/customers/${encodeURIComponent(uid)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isActive: next }),
    });
    if (res.ok) {
      setActive(next);
      setMsg('Account status updated.');
    } else if (res.status === 403) {
      setMsg('You do not have permission to change account status.');
    } else {
      setMsg('Could not update account status.');
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold">{data.displayName || data.email}</h1>
      <dl className="space-y-1 text-sm">
        <Row label="UID" value={data.uid} mono />
        <Row label="Email" value={`${data.email}${data.emailVerified ? ' (verified)' : ' (unverified)'}`} />
        <Row label="Phone" value={data.phone || '—'} />
        <Row label="Status" value={isActive ? 'active' : 'inactive'} />
        <Row label="Created" value={data.createdAt.slice(0, 10)} />
        <Row label="Last login" value={data.lastLoginAt.slice(0, 10) || '—'} />
      </dl>

      {msg && <p className="text-sm text-gray-700">{msg}</p>}

      <div className="flex gap-2">
        {isActive ? (
          <button
            type="button"
            onClick={() => toggleActive(false)}
            className="h-9 rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Deactivate account
          </button>
        ) : (
          <button
            type="button"
            onClick={() => toggleActive(true)}
            className="h-9 rounded-md border border-green-300 px-3 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            Reactivate account
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500">
        Passwords and credentials are managed by Firebase Auth and cannot be changed here.
      </p>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-600">{label}</dt>
      <dd className={mono ? 'font-mono text-xs' : ''}>{value}</dd>
    </div>
  );
}
