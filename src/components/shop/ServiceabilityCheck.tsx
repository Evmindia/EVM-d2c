'use client';

import { useEffect, useState } from 'react';

interface Result {
  serviceable: boolean;
  prepaidAvailable: boolean;
  codAvailable: boolean;
  areaCode: string | null;
}

type State = 'idle' | 'checking' | 'done' | 'error' | 'unavailable';

const VALID = /^[1-9]\d{5}$/;

export function ServiceabilityCheck({
  pincode,
  withInput = false,
}: {
  pincode?: string;
  withInput?: boolean;
}) {
  const [input, setInput] = useState('');
  const effective = withInput ? input : (pincode ?? '');
  const valid = VALID.test(effective);
  const [state, setState] = useState<State>('idle');
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    setState('idle');
    setResult(null);
  }, [effective]);

  async function check() {
    if (!valid) return;
    setState('checking');
    setResult(null);
    try {
      const res = await fetch(`/api/shipping/serviceability?pincode=${effective}`, {
        headers: { accept: 'application/json' },
      });
      if (res.status === 501) {
        setState('unavailable');
        return;
      }
      const json = (await res.json()) as { ok: boolean; data?: Result };
      if (res.ok && json.ok && json.data) {
        setResult(json.data);
        setState('done');
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  }

  return (
    <div className={withInput ? '' : 'mt-1.5'}>
      {withInput ? (
        <div className="flex gap-2">
          <input
            suppressHydrationWarning
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter delivery pincode"
            aria-label="Delivery pincode"
            className="h-9 w-44 rounded-full border border-neutral-300 bg-white px-4 text-xs font-medium text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
          <button
            suppressHydrationWarning
            type="button"
            onClick={check}
            disabled={!valid || state === 'checking'}
            className="h-9 rounded-full bg-neutral-950 px-4 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {state === 'checking' ? 'Checking…' : 'Check'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={check}
          disabled={!valid || state === 'checking'}
          className="text-xs font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-700 disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
        >
          {state === 'checking' ? 'Checking delivery…' : 'Check delivery availability'}
        </button>
      )}

      {state === 'done' && result && (
        <div
          className={`mt-3 rounded-xl border p-3 text-xs ${
            result.serviceable
              ? 'border-green-200 bg-green-50/90 text-green-900'
              : 'border-red-200 bg-red-50/90 text-red-900'
          }`}
          role="status"
        >
          {result.serviceable ? (
            <>
              <p className="font-semibold">✓ Delivery available to {effective}</p>
              <p className="mt-0.5 text-green-800">
                Prepaid delivery
                {result.areaCode ? ` · Area ${result.areaCode}` : ''}
              </p>
            </>
          ) : (
            <p className="font-semibold">✕ Sorry, we don&apos;t deliver to {effective} yet.</p>
          )}
        </div>
      )}

      {state === 'unavailable' && (
        <p className="mt-2 text-xs text-neutral-500">
          Live delivery check isn&apos;t available right now — we deliver across serviceable pin codes in India and validate your address at checkout.
        </p>
      )}

      {state === 'error' && (
        <p className="mt-2 text-xs text-red-600">Couldn&apos;t check right now. Please try again.</p>
      )}
    </div>
  );
}
