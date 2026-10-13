'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatInr } from '@/lib/format';
import { PaymentPanel } from './PaymentPanel';
import { ShipmentTracking } from './ShipmentTracking';

interface PublicOrder {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  shipmentStatus: string;
  awbNumber: string | null;
  carrier: string | null;
  items: { productTitleSnapshot: string; quantity: number; lineSubtotal: number }[];
  subtotal: number;
  total: number;
  currency: string;
}

/**
 * Order success (client). Fetches the order via its capability (httpOnly cookie
 * or ?token). Clearly distinguishes "Order created" from "Payment successful" —
 * a Phase 4 order is PAYMENT_PENDING and we NEVER show payment success.
 */
export function OrderSuccessClient({ reference }: { reference: string }) {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'notfound'>('loading');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(reference)}`, {
          headers: { accept: 'application/json' },
        });
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

  if (state === 'loading') return <p className="text-sm text-gray-600">Loading your order…</p>;

  if (state === 'notfound' || !order) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <h2 className="text-base font-semibold text-gray-900">Order not found</h2>
        <p className="mt-2 text-sm text-gray-600">
          We couldn&apos;t find this order, or you don&apos;t have access to it.
        </p>
        <Link href="/products" className="mt-6 inline-block text-sm font-semibold underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <h2 className="text-base font-semibold text-green-900">Order created</h2>
        <p className="mt-1 text-sm text-green-800">
          Your order <span className="font-mono font-semibold">{order.orderNumber}</span> has been
          created.
        </p>
      </div>

      {/* Server-authoritative payment state. The panel never claims success
          until OUR backend confirms the payment is CAPTURED. */}
      <PaymentPanel orderReference={order.orderNumber} />

      {/* Shipment / tracking */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900">Shipment</h3>
        {order.awbNumber ? (
          <>
            <p className="mt-1 text-xs text-gray-600">
              Tracking number:{' '}
              <span className="font-mono font-medium text-gray-900">{order.awbNumber}</span>
            </p>
            <div className="mt-2">
              <ShipmentTracking awbNumber={order.awbNumber} carrier={order.carrier} />
            </div>
          </>
        ) : (
          <p className="mt-1 text-xs text-gray-500">
            {order.shipmentStatus === 'DELIVERED'
              ? 'Your order has been delivered.'
              : "We'll share tracking here once your order ships."}
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900">Items</h3>
        <ul className="mt-2 divide-y divide-gray-100 text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between py-2">
              <span>
                {it.productTitleSnapshot} × {it.quantity}
              </span>
              <span className="font-medium">{formatInr(it.lineSubtotal) ?? '—'}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-sm font-semibold">
          <span>Total</span>
          <span>{formatInr(order.total) ?? '—'}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <a
          href={`/orders/${encodeURIComponent(order.orderNumber)}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Download GST Tax Invoice
        </a>

        <Link
          href="/products"
          className="inline-block rounded-lg border border-neutral-300 px-4 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
