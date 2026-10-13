'use client';

import { useEffect, useState, useCallback } from 'react';

interface Profile {
  email: string;
  displayName: string;
  phone: string;
  emailVerified: boolean;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/account/profile', { headers: { accept: 'application/json' } });
    if (res.ok) {
      const json = (await res.json()) as { data: Profile };
      setProfile(json.data);
      setDisplayName(json.data.displayName);
      setPhone(json.data.phone);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName, phone }),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { data: Profile };
      setProfile(json.data);
      setMsg({ kind: 'ok', text: 'Profile updated.' });
    } catch {
      setMsg({ kind: 'error', text: 'Could not update your profile. Please check your details.' });
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <p className="text-sm text-gray-600">Loading…</p>;

  return (
    <form onSubmit={save} className="max-w-sm space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Profile</h2>
      {msg && (
        <p role="alert" className={`text-sm ${msg.kind === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
          {msg.text}
        </p>
      )}
      <div>
        <label className="block text-sm text-gray-700">Email</label>
        <p className="mt-1 flex items-center gap-2 text-sm text-gray-900">
          {profile.email}
          {profile.emailVerified ? (
            <span className="rounded bg-green-100 px-1.5 text-xs text-green-800">Verified</span>
          ) : (
            <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">Unverified</span>
          )}
        </p>
        <p className="mt-1 text-xs text-gray-500">Email is managed by your login and can’t be changed here.</p>
      </div>
      <div>
        <label htmlFor="displayName" className="block text-sm text-gray-700">Full name</label>
        <input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name"
          className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900" />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm text-gray-700">Phone</label>
        <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel"
          className="mt-1 h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900" />
      </div>
      <button type="submit" disabled={busy}
        className="h-11 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
