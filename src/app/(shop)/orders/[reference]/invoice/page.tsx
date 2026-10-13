'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { TaxInvoice } from '@/components/orders/TaxInvoice';
import type { PublicOrder } from '@/services/orders/order.types';

export default function OrderInvoicePage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = use(params);
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'notfound'>('loading');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        // Try public customer order endpoint first
        let res = await fetch(`/api/orders/${encodeURIComponent(reference)}`, {
          headers: { accept: 'application/json' },
        });

        // Fallback to admin order endpoint if customer endpoint fails (for store managers)
        if (!res.ok) {
          res = await fetch(`/api/admin/orders/${encodeURIComponent(reference)}`, {
            headers: { accept: 'application/json' },
          });
        }

        if (!res.ok) {
          if (active) setState('notfound');
          return;
        }

        const json = (await res.json()) as { data: PublicOrder };
        if (active) {
          setOrder(json.data);
          setState('ok');
        }
      } catch {
        if (active) setState('notfound');
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [reference]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-medium text-neutral-600">
          <svg className="h-5 w-5 animate-spin text-neutral-900" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading Tax Invoice…</span>
        </div>
      </div>
    );
  }

  if (state === 'notfound' || !order) {
    return (
      <div className="mx-auto max-w-md my-12 rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-base font-bold text-neutral-900">Invoice Not Available</h2>
        <p className="mt-2 text-xs text-neutral-500">
          We couldn&apos;t load the invoice for reference <span className="font-mono">{reference}</span>.
        </p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white">
          Return to Store
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100/70 py-6 sm:py-10 print:bg-white print:py-0">
      <TaxInvoice order={order} />
    </div>
  );
}
