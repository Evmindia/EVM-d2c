'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatInr } from '@/lib/format';
import { useAdminData } from '@/components/admin/useAdminData';

interface Dashboard {
  products: { total: number | null; active: number | null; outOfStock: number | null };
  orders: { total: number | null; paymentPending: number | null; paid: number | null };
  recentOrders: { orderNumber: string; orderStatus: string; total: number; createdAt: string }[];
  recentActivity: { eventId: string; action: string; actorUid: string; createdAt: string }[];
  notes: string[];
}

function na(v: number | null): string {
  return v === null ? 'N/A' : String(v);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: me } = useAdminData<{ role: string }>('/api/admin/me');
  const isWarehouse = me?.role === 'warehouse';

  useEffect(() => {
    if (isWarehouse) {
      router.replace('/admin/orders');
    }
  }, [isWarehouse, router]);

  const { data, loading } = useAdminData<Dashboard>(isWarehouse ? null : '/api/admin/dashboard');

  if (isWarehouse) return <p className="text-sm text-gray-600">Redirecting to orders…</p>;
  if (loading) return <p className="text-sm text-gray-600">Loading dashboard…</p>;
  if (!data) return <p className="text-sm text-gray-600">Dashboard unavailable.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Products" value={na(data.products.total)} />
        <Stat label="Active" value={na(data.products.active)} />
        <Stat label="Out of stock" value={na(data.products.outOfStock)} />
        <Stat label="Orders" value={na(data.orders.total)} />
        <Stat label="Payment pending" value={na(data.orders.paymentPending)} />
        <Stat label="Paid" value={na(data.orders.paid)} />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-900">Recent orders</h2>
        {data.recentOrders.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No orders yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100">
            {data.recentOrders.map((o) => (
              <li key={o.orderNumber} className="flex justify-between py-2 text-sm">
                <Link href={`/admin/orders/${o.orderNumber}`} className="font-mono hover:underline">
                  {o.orderNumber}
                </Link>
                <span className="text-gray-500">{o.orderStatus.replace(/_/g, ' ').toLowerCase()}</span>
                <span className="font-medium">{formatInr(o.total) ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-900">Recent admin activity</h2>
        {data.recentActivity.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No activity yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 text-sm">
            {data.recentActivity.map((a) => (
              <li key={a.eventId} className="flex justify-between py-2">
                <span>{a.action}</span>
                <span className="text-gray-500">{a.createdAt.slice(0, 19).replace('T', ' ')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ul className="rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-500">
        {data.notes.map((n, i) => (
          <li key={i}>• {n}</li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="text-lg font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
