'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ThermalShippingLabel,
  type ShippingLabelOrder,
} from '@/components/admin/shipping/ThermalShippingLabel';

export default function PrintLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ refs?: string }>;
}) {
  const { refs: refsQuery } = use(searchParams);
  const [orders, setOrders] = useState<ShippingLabelOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderRefs = (refsQuery ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  useEffect(() => {
    if (orderRefs.length === 0) {
      setLoading(false);
      return;
    }

    let active = true;
    async function fetchOrders() {
      try {
        const fetched: ShippingLabelOrder[] = [];
        for (const ref of orderRefs) {
          const res = await fetch(`/api/admin/orders/${encodeURIComponent(ref)}`);
          if (res.ok) {
            const json = (await res.json()) as { ok: boolean; data?: ShippingLabelOrder };
            if (json.ok && json.data) {
              fetched.push(json.data);
            }
          }
        }
        if (!active) return;
        setOrders(fetched);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load orders.');
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchOrders();
    return () => {
      active = false;
    };
  }, [refsQuery]);

  if (orderRefs.length === 0) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <h1 className="text-base font-bold text-gray-900">No Orders Selected</h1>
        <p className="text-xs text-gray-500 mt-1">
          Select one or more orders from the Orders page to print custom thermal shipping stickers.
        </p>
        <Link
          href="/admin/orders"
          className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-xs font-semibold text-white"
        >
          ← Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Top action toolbar (Hidden during print) */}
      <div className="print:hidden sticky top-0 z-20 bg-gray-900 text-white px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="text-xs text-gray-300 hover:text-white underline"
          >
            ← Back to Orders
          </Link>
          <span className="text-xs font-bold text-gray-400">|</span>
          <span className="text-sm font-semibold">
            {loading
              ? 'Loading labels…'
              : `Ready to Print: ${orders.length} Thermal Label${orders.length > 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:inline">
            Printer Format: <strong>4&quot; × 6&quot; (100mm × 150mm)</strong>
          </span>
          <button
            onClick={() => window.print()}
            disabled={loading || orders.length === 0}
            className="rounded bg-white text-gray-900 px-4 py-1.5 text-xs font-bold hover:bg-gray-100 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            🖨️ Print Labels ({orders.length})
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm text-gray-500 print:hidden">
          Loading shipping labels for {orderRefs.length} order(s)…
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs text-center print:hidden">
          {error}
        </div>
      )}

      {/* Printable Thermal Label Stream */}
      <div className="py-6 print:py-0 bg-gray-100 print:bg-white min-h-screen space-y-6 print:space-y-0">
        {orders.map((order) => (
          <div key={order.orderNumber} className="print:m-0">
            <ThermalShippingLabel order={order} />
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: 4in 6in;
            margin: 0;
          }
          body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          nav, header, footer, .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
