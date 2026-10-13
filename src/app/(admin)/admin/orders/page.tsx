'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatInr } from '@/lib/format';
import { useAdminData } from '@/components/admin/useAdminData';

interface OrderRow {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  total: number;
  customerEmail: string;
  createdAt: string;
}

const STATUS_FILTERS = [
  { label: 'All Orders', value: '' },
  { label: 'To Pack (Processing)', value: 'PROCESSING' },
  { label: 'To Ship (Packed)', value: 'PACKED' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
];

export default function AdminOrdersPage() {
  const [email, setEmail] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [query, setQuery] = useState<string>('/api/admin/orders?limit=50');
  const { data, loading } = useAdminData<{ orders: OrderRow[] }>(query);

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  function handleFilterChange(status: string) {
    setSelectedStatus(status);
    setSelectedOrders(new Set());
    if (status) {
      setQuery(`/api/admin/orders?status=${status}&limit=50`);
    } else {
      setQuery('/api/admin/orders?limit=50');
    }
  }

  const orders = data?.orders ?? [];

  function toggleSelectAll() {
    if (selectedOrders.size === orders.length && orders.length > 0) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.orderNumber)));
    }
  }

  function toggleSelectOrder(ref: string) {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  }

  const selectedList = Array.from(selectedOrders).join(',');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders & Fulfillment</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage dispatch, pack parcels, and print thermal shipping stickers.
          </p>
        </div>

        {/* Bulk Action Bar */}
        {selectedOrders.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-sm animate-in fade-in duration-150">
            <span className="text-xs font-semibold px-1">
              {selectedOrders.size} selected:
            </span>
            <Link
              href={`/admin/orders/print-labels?refs=${encodeURIComponent(selectedList)}`}
              target="_blank"
              className="rounded bg-white text-gray-900 px-3 py-1 text-xs font-bold hover:bg-gray-100 transition-colors"
            >
              🏷️ Print Stickers ({selectedOrders.size})
            </Link>
            <Link
              href={`/admin/orders/print-invoices?refs=${encodeURIComponent(selectedList)}`}
              target="_blank"
              className="rounded bg-gray-800 text-white border border-gray-700 px-3 py-1 text-xs font-semibold hover:bg-gray-700 transition-colors"
            >
              📄 Print Invoices ({selectedOrders.size})
            </Link>
            <button
              onClick={() => setSelectedOrders(new Set())}
              className="text-xs text-gray-400 hover:text-white px-1 ml-1"
            >
              Deselect
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 text-xs">
          {STATUS_FILTERS.map((f) => {
            const active = selectedStatus === f.value;
            return (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <form
          className="flex gap-2 w-full md:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            setSelectedOrders(new Set());
            setQuery(
              email
                ? `/api/admin/orders?email=${encodeURIComponent(email)}`
                : selectedStatus
                ? `/api/admin/orders?status=${selectedStatus}&limit=50`
                : '/api/admin/orders?limit=50',
            );
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Search customer email"
            className="h-8 rounded-md border border-gray-300 px-2.5 text-xs w-full md:w-56"
          />
          <button
            type="submit"
            className="h-8 rounded-md bg-gray-900 px-3 text-xs font-semibold text-white hover:bg-gray-800"
          >
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600 py-6 text-center">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-600 font-medium">No orders found.</p>
          <p className="text-xs text-gray-400 mt-1">
            {selectedStatus ? 'Try changing the status filter.' : 'New orders will appear here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-600 uppercase">
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selectedOrders.size === orders.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all orders"
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 h-3.5 w-3.5"
                  />
                </th>
                <th className="py-3 px-2">Order</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Payment</th>
                <th className="py-3 px-2">Customer Email</th>
                <th className="py-3 px-2 text-right">Total</th>
                <th className="py-3 px-3 text-right">Quick Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => {
                const isSelected = selectedOrders.has(o.orderNumber);
                return (
                  <tr
                    key={o.orderNumber}
                    className={`hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOrder(o.orderNumber)}
                        aria-label={`Select order ${o.orderNumber}`}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 h-3.5 w-3.5"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Link
                        href={`/admin/orders/${o.orderNumber}`}
                        className="font-mono font-bold text-gray-900 hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-2">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-800">
                        {o.orderStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`text-[11px] font-semibold ${
                          o.paymentStatus === 'CAPTURED' || o.paymentStatus === 'PAID'
                            ? 'text-green-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-600 truncate max-w-xs">
                      {o.customerEmail}
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-gray-900">
                      {formatInr(o.total) ?? '—'}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/admin/orders/print-labels?refs=${encodeURIComponent(o.orderNumber)}`}
                        target="_blank"
                        title="Print 4x6 Thermal Sticker"
                        className="inline-block rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-bold text-gray-800 hover:bg-gray-100 shadow-2xs"
                      >
                        🏷️ Sticker
                      </Link>
                      <Link
                        href={`/admin/orders/print-invoices?refs=${encodeURIComponent(o.orderNumber)}`}
                        target="_blank"
                        title="Print Tax Invoice"
                        className="inline-block rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 shadow-2xs"
                      >
                        📄 Invoice
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
