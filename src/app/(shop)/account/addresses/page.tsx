'use client';

import { useEffect, useState, useCallback } from 'react';

interface Address {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

const EMPTY = {
  fullName: '', phone: '', addressLine1: '', addressLine2: '', landmark: '',
  city: '', state: '', postalCode: '',
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/account/addresses', { headers: { accept: 'application/json' } });
    if (res.ok) {
      const json = (await res.json()) as { data: { addresses: Address[] } };
      setAddresses(json.data.addresses);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        fullName: form.fullName,
        phone: form.phone,
        addressLine1: form.addressLine1,
        ...(form.addressLine2 ? { addressLine2: form.addressLine2 } : {}),
        ...(form.landmark ? { landmark: form.landmark } : {}),
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: 'IN',
      };
      const res = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setForm({ ...EMPTY });
      await load();
    } catch {
      setError('Could not save the address. Please check the fields (PIN must be 6 digits).');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/account/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await load();
  }

  const s = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Saved addresses</h2>
        {addresses === null ? (
          <p className="mt-2 text-sm text-gray-600">Loading…</p>
        ) : addresses.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">You have no saved addresses yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {addresses.map((a) => (
              <li key={a.id} className="flex justify-between gap-3 rounded-md border border-gray-200 p-3 text-sm">
                <div>
                  <span className="font-medium text-gray-900">{a.fullName}</span>
                  {a.isDefault && <span className="ml-2 rounded bg-gray-100 px-1.5 text-xs">Default</span>}
                  <p className="mt-0.5 text-gray-600">
                    {a.addressLine1}
                    {a.addressLine2 ? `, ${a.addressLine2}` : ''}, {a.city}, {a.state} {a.postalCode}
                  </p>
                  <p className="text-xs text-gray-500">{a.phone}</p>
                </div>
                <button type="button" onClick={() => remove(a.id)} className="h-8 text-xs text-gray-500 underline hover:text-gray-900">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={add} className="max-w-md space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Add an address</h3>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <F id="fullName" label="Full name" v={form.fullName} on={(x) => s('fullName', x)} req />
        <F id="phone" label="Phone" v={form.phone} on={(x) => s('phone', x)} req />
        <F id="addressLine1" label="Address line 1" v={form.addressLine1} on={(x) => s('addressLine1', x)} req />
        <F id="addressLine2" label="Address line 2 (optional)" v={form.addressLine2} on={(x) => s('addressLine2', x)} />
        <div className="grid grid-cols-2 gap-3">
          <F id="city" label="City" v={form.city} on={(x) => s('city', x)} req />
          <F id="state" label="State" v={form.state} on={(x) => s('state', x)} req />
        </div>
        <F id="postalCode" label="PIN code" v={form.postalCode} on={(x) => s('postalCode', x)} req />
        <button type="submit" disabled={busy}
          className="h-11 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Saving…' : 'Save address'}
        </button>
      </form>
    </div>
  );
}

function F({ id, label, v, on, req }: { id: string; label: string; v: string; on: (x: string) => void; req?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-gray-700">{label}</label>
      <input id={id} value={v} required={req} onChange={(e) => on(e.target.value)}
        className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900" />
    </div>
  );
}
