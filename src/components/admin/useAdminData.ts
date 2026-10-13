'use client';

import { useEffect, useState } from 'react';

/**
 * Small client hook to GET an admin API endpoint (session cookie auto-sent).
 * Returns { data, error, loading }. The server enforces authorization; a 401/403
 * surfaces here as an error, and the AdminGuard already blocks non-admins.
 */
export function useAdminData<T>(url: string | null): {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) return;
    let active = true;
    // Reset loading on url change; real state is set after the async fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(url, { headers: { accept: 'application/json' } })
      .then(async (r) => {
        const json = (await r.json()) as { ok: boolean; data?: T; error?: { message: string } };
        if (!active) return;
        if (r.ok && json.ok) setData(json.data ?? null);
        else setError(json.error?.message ?? 'Request failed.');
      })
      .catch(() => active && setError('Could not load data.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [url, tick]);

  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}
