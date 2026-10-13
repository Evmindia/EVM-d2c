'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatInr } from '@/lib/format';

interface OrderRow {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/account/orders', { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { data: { orders: OrderRow[] } }) => active && setOrders(j.data.orders))
      .catch(() => active && setOrders([]));
    return () => {
      active = false;
    };
  }, []);

  if (orders === null) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="h-16 w-full rounded-lg bg-gray-100" />
        <div className="h-16 w-full rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-8 text-center">
        <svg
          className="mx-auto h-10 w-10 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h2 className="mt-2 text-sm font-semibold text-gray-900">No orders yet</h2>
        <p className="mt-1 text-xs text-gray-500">Your completed purchases will appear here.</p>
        <Link
          href="/products"
          className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900">Your orders</h2>
      <ul className="mt-3 divide-y divide-gray-100">
        {orders.map((o) => (
          <li key={o.orderNumber} className="flex items-center justify-between gap-3 py-3 px-2 transition hover:bg-neutral-50 rounded-lg">
            <Link
              href={`/order/success/${encodeURIComponent(o.orderNumber)}`}
              className="group flex flex-1 items-center justify-between gap-3 focus:outline-none"
              aria-label={`View details for order ${o.orderNumber}`}
            >
              <div>
                <span className="font-mono text-sm font-medium text-gray-900 group-hover:underline">
                  {o.orderNumber}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {o.orderStatus.replace(/_/g, ' ').toLowerCase()} · payment {o.paymentStatus.toLowerCase()}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900 pr-2">
                {formatInr(o.total) ?? '—'}
              </span>
            </Link>

            <a
              href={`/orders/${encodeURIComponent(o.orderNumber)}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 shrink-0"
              title="View GST Tax Invoice"
            >
              <svg className="h-3.5 w-3.5 text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Invoice
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
