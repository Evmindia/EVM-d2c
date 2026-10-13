'use client';

import { useState } from 'react';
import { formatInr } from '@/lib/format';
import { useAdminData } from '@/components/admin/useAdminData';

interface AdminPayment {
  orderReference: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  attempts: number;
  failureReason: string | null;
  capturedAt: string | null;
}

export default function AdminPaymentsPage() {
  const [ref, setRef] = useState('');
  const [query, setQuery] = useState<string | null>(null);
  const { data, loading, error } = useAdminData<AdminPayment>(query);

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold">Payments</h1>
      <p className="text-sm text-gray-600">
        View-only. Payment state is controlled by the payment system — there is no manual capture,
        refund, or amount change here.
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(`/api/admin/payments?order=${encodeURIComponent(ref.trim())}`);
        }}
      >
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="Order reference (EVM-XXXXXXXX)"
          className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm"
        />
        <button type="submit" className="h-9 rounded-md bg-gray-900 px-3 text-sm font-semibold text-white">
          Look up
        </button>
      </form>

      {query && loading && <p className="text-sm text-gray-600">Loading…</p>}
      {query && !loading && (error || !data) && (
        <p className="text-sm text-gray-600">{error ?? 'No payment found for that order.'}</p>
      )}
      {data && (
        <dl className="space-y-1 rounded-md border border-gray-200 p-3 text-sm">
          <Row label="Order" value={data.orderReference} mono />
          <Row label="Provider" value={data.provider} />
          <Row label="Status" value={data.status} />
          <Row label="Amount" value={`${formatInr(data.amount) ?? '—'} ${data.currency}`} />
          <Row label="Provider order id" value={data.providerOrderId ?? '—'} mono />
          <Row label="Provider payment id" value={data.providerPaymentId ?? '—'} mono />
          <Row label="Attempts" value={String(data.attempts)} />
          <Row label="Failure" value={data.failureReason ?? '—'} />
          <Row label="Captured at" value={data.capturedAt ?? '—'} />
        </dl>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-600">{label}</dt>
      <dd className={mono ? 'break-all font-mono text-xs' : ''}>{value}</dd>
    </div>
  );
}
