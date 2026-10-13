'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatInr } from '@/lib/format';

/**
 * Payment panel (client). Server-authoritative:
 *  - Reads payment status from OUR backend (never assumes the browser return
 *    means paid).
 *  - "Pay now" calls OUR /api/payments/create (server creates the Razorpay order
 *    with the authoritative amount), then opens Razorpay Checkout with the
 *    PUBLIC key only.
 *  - On the Razorpay callback, posts the signature to /api/payments/verify; the
 *    SERVER verifies + captures. We then poll status until PAID/FAILED.
 *  - Never claims success until the server confirms CAPTURED.
 */
interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  handler: (r: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayInstance {
  open: () => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';
interface PaymentDTO {
  orderReference: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function PaymentPanel({ orderReference }: { orderReference: string }) {
  const [payment, setPayment] = useState<PaymentDTO | null>(null);
  const [phase, setPhase] = useState<'idle' | 'starting' | 'confirming' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/status?order=${encodeURIComponent(orderReference)}`, {
        headers: { accept: 'application/json' },
      });
      if (res.ok) {
        const json = (await res.json()) as { data: PaymentDTO };
        setPayment(json.data);
        return json.data.status;
      }
    } catch {
      /* ignore */
    }
    return null;
  }, [orderReference]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function pay() {
    setPhase('starting');
    setMessage(null);
    try {
      const createRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderReference }),
      });
      if (!createRes.ok) throw new Error('create');
      const { data: init } = (await createRes.json()) as {
        data: {
          keyId: string;
          providerOrderId: string;
          amount: number;
          currency: string;
          paymentUrl?: string;
        };
      };

      if (init.paymentUrl) {
        window.location.href = init.paymentUrl;
        return;
      }

      const ready = await loadRazorpayScript();
      if (!ready || !window.Razorpay) throw new Error('script');

      const rzp = new window.Razorpay({
        key: init.keyId,
        order_id: init.providerOrderId,
        amount: init.amount,
        currency: init.currency,
        name: 'EVM',
        handler: async (r) => {
          setPhase('confirming');
          try {
            await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                orderReference,
                providerOrderId: r.razorpay_order_id,
                providerPaymentId: r.razorpay_payment_id,
                signature: r.razorpay_signature,
              }),
            });
          } finally {
            // Server is authoritative — poll for the confirmed state.
            await refresh();
            setPhase('idle');
          }
        },
        modal: { ondismiss: () => setPhase('idle') },
      });
      rzp.open();
    } catch {
      setPhase('error');
      setMessage('We couldn’t start the payment. Please try again.');
    }
  }

  const status = payment?.status ?? 'PENDING';

  if (status === 'CAPTURED') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-semibold text-green-900">Payment successful</p>
        <p className="mt-1 text-xs text-green-800">
          We’ve received your payment of {formatInr(payment!.amount) ?? ''}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">
        {phase === 'confirming' ? 'Payment is being confirmed…' : 'Payment pending'}
      </p>
      <p className="text-xs text-amber-800">
        {status === 'FAILED'
          ? 'The previous attempt did not complete. You can retry the payment.'
          : 'Complete your payment to confirm this order. You have not been charged yet.'}
      </p>
      {message && <p className="text-xs text-red-700">{message}</p>}
      <button
        type="button"
        onClick={pay}
        disabled={phase === 'starting' || phase === 'confirming'}
        className="h-11 w-full rounded-md bg-gray-900 text-sm font-semibold text-white disabled:opacity-50"
      >
        {phase === 'starting'
          ? 'Starting…'
          : status === 'FAILED'
            ? 'Retry payment'
            : 'Pay now'}
      </button>
    </div>
  );
}
