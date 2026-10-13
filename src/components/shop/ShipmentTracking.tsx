'use client';

import { useState } from 'react';

/**
 * Customer-facing shipment tracking (client island). Given a courier AWB it
 * calls the public GET /api/shipping/track endpoint (non-PII status only) and
 * shows the latest status. Degrades gracefully when tracking is unavailable
 * (e.g. eShipz not configured → 501).
 */
interface TrackingInfo {
  awbNumber: string;
  status: string | null;
  statusType: string | null;
  statusDate: string | null;
  expectedDeliveryDate: string | null;
  delivered: boolean;
}

type State = 'idle' | 'loading' | 'done' | 'error' | 'unavailable';

export function ShipmentTracking({ awbNumber, carrier }: { awbNumber: string; carrier?: string | null }) {
  const [state, setState] = useState<State>('idle');
  const [info, setInfo] = useState<TrackingInfo | null>(null);

  async function track() {
    setState('loading');
    setInfo(null);
    try {
      const carrierQs = carrier ? `&carrier=${encodeURIComponent(carrier)}` : '';
      const res = await fetch(`/api/shipping/track?awb=${encodeURIComponent(awbNumber)}${carrierQs}`, {
        headers: { accept: 'application/json' },
      });
      if (res.status === 501) {
        setState('unavailable');
        return;
      }
      const json = (await res.json()) as { ok: boolean; data?: TrackingInfo };
      if (res.ok && json.ok && json.data) {
        setInfo(json.data);
        setState('done');
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={track}
        disabled={state === 'loading'}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
      >
        {state === 'loading' ? 'Tracking…' : 'Track shipment'}
      </button>

      {state === 'done' && info && (
        <div
          className={`mt-2 rounded-md border p-2.5 text-xs ${
            info.delivered
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-gray-200 bg-gray-50 text-gray-700'
          }`}
          role="status"
        >
          <p className="font-semibold">{info.status ?? 'Status unavailable'}</p>
          <p className="mt-0.5 text-gray-500">
            {info.statusDate ? `As of ${info.statusDate}` : ''}
            {info.expectedDeliveryDate ? ` · Expected ${info.expectedDeliveryDate}` : ''}
          </p>
        </div>
      )}
      {state === 'unavailable' && (
        <p className="mt-2 text-xs text-gray-500">Live tracking isn&apos;t available right now.</p>
      )}
      {state === 'error' && (
        <p className="mt-2 text-xs text-red-600">Couldn&apos;t fetch tracking. Please try again.</p>
      )}
    </div>
  );
}
