'use client';

import { use, useEffect, useState } from 'react';
import { formatInr } from '@/lib/format';
import { useAdminData } from '@/components/admin/useAdminData';

interface AdminOrder {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  shipmentStatus: string;
  tallyStatus?: 'SENT' | 'FAILED' | 'PENDING' | null;
  tallySyncedAt?: string | null;
  awbNumber: string | null;
  shipmentProvider: string | null;
  labelUrl: string | null;
  hasLabel: boolean;
  allowedNextStatuses: string[];
  total: number;
  subtotal: number;
  discount: number;
  tax: { status: string; amount: number | null };
  shipping: { status: string; amount: number | null };
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: { productTitleSnapshot: string; sku: string; quantity: number; unitPrice: number; lineSubtotal: number }[];
  shippingAddress: { addressLine1: string; city: string; state: string; postalCode: string };
}

interface TrackingInfo {
  awbNumber: string;
  status: string | null;
  statusType: string | null;
  statusDate: string | null;
  expectedDeliveryDate: string | null;
  delivered: boolean;
}

/** Action label + style per target fulfillment status. */
const ACTION: Record<string, { label: string; danger?: boolean }> = {
  PROCESSING: { label: 'Approve' },
  PACKED: { label: 'Mark Packed' },
  SHIPPED: { label: 'Ship — Create Shipment' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery' },
  DELIVERED: { label: 'Mark Delivered' },
  CANCELLED: { label: 'Cancel Order', danger: true },
};

export default function AdminOrderDetailPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = use(params);
  const { data, loading, error } = useAdminData<AdminOrder>(
    `/api/admin/orders/${encodeURIComponent(reference)}`,
  );

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tallyBusy, setTallyBusy] = useState(false);
  const [tallyMessage, setTallyMessage] = useState<string | null>(null);

  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [trackState, setTrackState] = useState<'idle' | 'loading' | 'done' | 'error' | 'unavailable'>('idle');

  useEffect(() => {
    if (data) setOrder(data);
  }, [data]);

  async function pushToTally() {
    if (!order) return;
    setTallyBusy(true);
    setTallyMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.orderNumber)}/push-tally`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      const json = (await res.json()) as { ok: boolean; data?: { success: boolean; order?: AdminOrder }; error?: { message: string } };
      if (!res.ok || !json.ok) throw new Error(json.error?.message ?? 'Tally export failed.');
      if (json.data?.order) {
        setOrder(json.data.order);
      }
      if (json.data?.success) {
        setTallyMessage('Successfully exported Sales Order to Tally!');
      } else {
        setTallyMessage('Failed to export to Tally ERP. Check endpoint availability.');
      }
    } catch (e) {
      setTallyMessage(e instanceof Error ? e.message : 'Tally export failed.');
    } finally {
      setTallyBusy(false);
    }
  }

  async function track() {
    if (!order?.awbNumber) return;
    setTrackState('loading');
    setTracking(null);
    try {
      const carrier = order.shipmentProvider ? `&carrier=${encodeURIComponent(order.shipmentProvider)}` : '';
      const res = await fetch(`/api/shipping/track?awb=${encodeURIComponent(order.awbNumber)}${carrier}`, {
        headers: { accept: 'application/json' },
      });
      if (res.status === 501) {
        setTrackState('unavailable');
        return;
      }
      const json = (await res.json()) as { ok: boolean; data?: TrackingInfo };
      if (res.ok && json.ok && json.data) {
        setTracking(json.data);
        setTrackState('done');
      } else {
        setTrackState('error');
      }
    } catch {
      setTrackState('error');
    }
  }

  async function markPaid() {
    if (!order) return;
    setBusy('PAID');
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.orderNumber)}/mark-paid`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
      });
      const json = (await res.json()) as { ok: boolean; data?: AdminOrder; error?: { message: string } };
      if (!res.ok || !json.ok) throw new Error(json.error?.message ?? 'Failed to mark paid.');
      if (json.data) setOrder(json.data);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to mark paid.');
    } finally {
      setBusy(null);
    }
  }

  async function advance(status: string) {
    if (!order) return;
    if (status === 'CANCELLED' && !confirm('Cancel this order? This cannot be undone.')) return;
    setBusy(status);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.orderNumber)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as { ok: boolean; data?: AdminOrder; error?: { message: string } };
      if (!res.ok || !json.ok) throw new Error(json.error?.message ?? 'Update failed.');
      if (json.data) setOrder(json.data);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-sm text-gray-600">Loading…</p>;
  if (error || !order) return <p className="text-sm text-gray-600">{error ?? 'Order not found.'}</p>;

  const isTallySent = order.tallyStatus === 'SENT';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-lg font-semibold">{order.orderNumber}</h1>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{order.orderStatus.replace(/_/g, ' ').toLowerCase()}</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">payment: {order.paymentStatus.toLowerCase()}</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
            shipment: {order.shipmentStatus.replace(/_/g, ' ').toLowerCase()}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold ${
              isTallySent
                ? 'bg-emerald-100 text-emerald-800'
                : order.tallyStatus === 'FAILED'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 text-amber-800'
            }`}
          >
            tally: {isTallySent ? 'sent' : order.tallyStatus === 'FAILED' ? 'not sent (failed)' : 'not sent'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={pushToTally}
            disabled={tallyBusy}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
              isTallySent
                ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                : 'bg-emerald-700 text-white hover:bg-emerald-800'
            } disabled:opacity-50`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {tallyBusy ? 'Pushing to Tally…' : isTallySent ? 'Resync to Tally' : 'Push to Tally Manually'}
          </button>

          <a
            href={`/orders/${encodeURIComponent(order.orderNumber)}/invoice`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
          >
            <svg className="h-4 w-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            View / Print Tax Invoice
          </a>
        </div>
      </div>

      {tallyMessage && (
        <div
          className={`rounded-lg border p-3 text-xs font-semibold ${
            tallyMessage.includes('Successfully')
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {tallyMessage}
        </div>
      )}

      {/* Test-only: mark an unpaid order PAID so the ship flow can be exercised
          before the payment gateway is live. Hidden in production builds. */}
      {order.orderStatus === 'PAYMENT_PENDING' && process.env.NODE_ENV !== 'production' && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <span className="font-medium">Test tool:</span>
          <span>Payment isn&apos;t wired yet — mark this order paid to test shipping.</span>
          <button
            type="button"
            onClick={markPaid}
            disabled={busy !== null}
            className="rounded-md bg-amber-800 px-3 py-1.5 font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
          >
            {busy === 'PAID' ? 'Marking…' : 'Mark as Paid (test)'}
          </button>
        </div>
      )}

      {/* Fulfillment actions */}
      <section className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
        <h2 className="text-sm font-semibold text-gray-900">Fulfillment</h2>
        {order.awbNumber && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-gray-600">
              AWB: <span className="font-mono font-medium text-gray-900">{order.awbNumber}</span>
              {order.shipmentProvider && order.shipmentProvider !== 'PLACEHOLDER' && (
                <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
                  {order.shipmentProvider}
                </span>
              )}
              {order.shipmentProvider === 'PLACEHOLDER' && (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                  placeholder — eShipz not wired yet
                </span>
              )}
            </p>

            {order.shipmentProvider && order.shipmentProvider !== 'PLACEHOLDER' ? (
              <div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={track}
                    disabled={trackState === 'loading'}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {trackState === 'loading' ? 'Tracking…' : 'Track Shipment'}
                  </button>
                  {order.labelUrl ? (
                    <a
                      href={order.labelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                    >
                      Courier Label (eShipz)
                    </a>
                  ) : order.hasLabel ? (
                    <a
                      href={`/api/admin/orders/${encodeURIComponent(order.orderNumber)}/label`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                    >
                      Courier Label (PDF)
                    </a>
                  ) : null}
                </div>

                {trackState === 'done' && tracking && (
                  <div
                    className={`mt-2 rounded-md border p-2.5 text-xs ${
                      tracking.delivered
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-gray-200 bg-gray-50 text-gray-700'
                    }`}
                    role="status"
                  >
                    <p className="font-semibold">{tracking.status ?? 'Status unavailable'}</p>
                    <p className="mt-0.5 text-gray-500">
                      {tracking.statusDate ? `As of ${tracking.statusDate}` : ''}
                      {tracking.expectedDeliveryDate ? ` · Expected ${tracking.expectedDeliveryDate}` : ''}
                    </p>
                  </div>
                )}
                {trackState === 'unavailable' && (
                  <p className="mt-2 text-xs text-gray-500">Live tracking isn&apos;t available right now.</p>
                )}
                {trackState === 'error' && (
                  <p className="mt-2 text-xs text-red-600">Couldn&apos;t fetch tracking. Try again.</p>
                )}
              </div>
            ) : order.shipmentProvider === 'PLACEHOLDER' ? (
              <p className="text-[11px] text-gray-400">
                Tracking becomes available once a real eShipz shipment is created.
              </p>
            ) : null}
          </div>
        )}
        {order.allowedNextStatuses.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {order.allowedNextStatuses.map((s) => {
              const cfg = ACTION[s] ?? { label: s };
              return (
                <button
                  key={s}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => advance(s)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                    cfg.danger
                      ? 'border border-red-300 bg-white text-red-700 hover:bg-red-50'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {busy === s ? 'Working…' : cfg.label}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-500">
            No further fulfillment actions available for this status.
          </p>
        )}

        {/* Dispatch Documents Printing */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-200">
          <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mr-1">
            Dispatch Print:
          </span>
          <a
            href={`/admin/orders/print-labels?refs=${encodeURIComponent(order.orderNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800 shadow-sm"
          >
            🏷️ Print Thermal Sticker (4"×6")
          </a>
          <a
            href={`/admin/orders/print-invoices?refs=${encodeURIComponent(order.orderNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
          >
            📄 Print Tax Invoice
          </a>
        </div>

        {actionError && <p className="mt-2 text-xs font-medium text-red-600">{actionError}</p>}
        <p className="mt-3 text-[11px] text-gray-400">
          Shipping to SHIPPED creates the shipment. eShipz AWB generation replaces the placeholder
          once integrated.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Customer</h2>
        <p className="mt-1 text-sm text-gray-700">
          {order.customerName} · {order.customerEmail} · {order.customerPhone}
        </p>
        <p className="text-sm text-gray-600">
          {order.shippingAddress.addressLine1}, {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
          {order.shippingAddress.postalCode}
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Items</h2>
        <ul className="mt-2 divide-y divide-gray-100 text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between py-2">
              <span>
                {it.productTitleSnapshot} <span className="text-gray-400">({it.sku})</span> × {it.quantity}
              </span>
              <span className="font-medium">{formatInr(it.lineSubtotal) ?? '—'}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
          <Row label="Subtotal" value={formatInr(order.subtotal) ?? '—'} />
          <Row label="Discount" value={formatInr(order.discount) ?? '—'} />
          <Row label="Tax" value={order.tax.amount === null ? 'Pending' : (formatInr(order.tax.amount) ?? '—')} />
          <Row label="Shipping" value={order.shipping.amount === null ? 'Pending' : (formatInr(order.shipping.amount) ?? '—')} />
          <Row label="Total" value={formatInr(order.total) ?? '—'} strong />
        </dl>
      </section>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-600">{label}</dt>
      <dd className={strong ? 'font-semibold' : ''}>{value}</dd>
    </div>
  );
}
