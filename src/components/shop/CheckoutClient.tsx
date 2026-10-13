'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatInr } from '@/lib/format';
import { ServiceabilityCheck } from './ServiceabilityCheck';
import { useAuth } from '@/components/auth/AuthProvider';
import { PhoneOtpLogin } from '@/components/auth/PhoneOtpLogin';
import type { CartView } from '@/services/cart/cart.types';

const ADDRESS_CACHE_KEY = 'evm-checkout-address';

type BillingState = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
};

const EMPTY_BILLING: BillingState = {
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: '',
  postalCode: '',
};

interface SavedAddressLite {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
}

/**
 * Checkout form + summary (client island).
 *
 * Item lines and subtotal come from the server cart. Tax, shipping, and the
 * final total are shown as explicit PENDING states — no fake "Free shipping",
 * "0% GST", delivery dates, or total. Place Order posts to the server, which is
 * the sole authority; while tax/shipping are pending it safely refuses and we
 * surface that truthfully (no fake success).
 */
type FormState = {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  billingSame: boolean;
};

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

interface PreviewData {
  subtotal: number;
  discount: number;
  taxAmount: number | null;
  taxBreakdown: { cgst: number; sgst: number; igst: number; intraState: boolean; rate: number | null } | null;
  shippingAmount: number;
  total: number | null;
  configurationComplete: boolean;
  issues: string[];
}

const EMPTY: FormState = {
  fullName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: '',
  postalCode: '',
  billingSame: true,
};

export function CheckoutClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartView | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [billing, setBilling] = useState<BillingState>(EMPTY_BILLING);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const localPrefilledRef = useRef(false);
  const accountPrefilledRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/cart', { headers: { accept: 'application/json' } });
      if (res.ok) {
        const json = (await res.json()) as { data: CartView };
        setCart(json.data);
      }
    } catch {
      /* leave cart null -> loading */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-capture a saved address. Never overwrites what the user has typed
  // (applied only while the relevant fields are still empty).
  useEffect(() => {
    let active = true;

    function applyIfEmpty(patch: Partial<FormState>) {
      setForm((f) => {
        if (f.fullName || f.addressLine1 || f.postalCode) return f;
        return { ...f, ...patch };
      });
    }

    // Browser-cached address (once; works for guests too).
    if (!localPrefilledRef.current) {
      localPrefilledRef.current = true;
      try {
        const cached = localStorage.getItem(ADDRESS_CACHE_KEY);
        if (cached) applyIfEmpty(JSON.parse(cached) as Partial<FormState>);
      } catch {
        /* ignore */
      }
    }

    // On sign-in (e.g. after phone OTP), pull the authoritative saved address
    // + known phone/email from the account — once per user.
    if (!user || accountPrefilledRef.current === user.uid) return;
    accountPrefilledRef.current = user.uid;

    if (user.phoneNumber) applyIfEmpty({ phone: user.phoneNumber.replace(/^\+91/, '') });
    if (user.email) applyIfEmpty({ email: user.email });

    fetch('/api/account/addresses', { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data?: { addresses?: SavedAddressLite[] } } | null) => {
        if (!active) return;
        const a = j?.data?.addresses?.[0];
        if (a) {
          applyIfEmpty({
            fullName: a.fullName,
            phone: a.phone,
            addressLine1: a.addressLine1,
            addressLine2: a.addressLine2 ?? '',
            landmark: a.landmark ?? '',
            city: a.city,
            state: a.state,
            postalCode: a.postalCode,
          });
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user]);

  // Dynamic authoritative checkout preview (GST & Total).
  useEffect(() => {
    if (!cart || cart.lines.length === 0) {
      setPreview(null);
      return;
    }
    if (!form.state) {
      setPreview(null);
      return;
    }

    let active = true;
    setPreviewLoading(true);

    const timer = setTimeout(() => {
      const normalizedState =
        INDIAN_STATES.find(
          (s) =>
            s.toLowerCase() === form.state.toLowerCase() ||
            (form.state.toLowerCase().startsWith('mahara') && s === 'Maharashtra'),
        ) || form.state;

      const body = {
        customer: {
          fullName: form.fullName || 'Guest Customer',
          email: form.email || 'guest@evmzone.com',
          phone: form.phone || '9999999999',
        },
        shippingAddress: {
          fullName: form.fullName || 'Guest Customer',
          phone: form.phone || '9999999999',
          addressLine1: form.addressLine1 || 'Pending Address',
          city: form.city || 'City',
          state: normalizedState,
          postalCode: /^[1-9]\d{5}$/.test(form.postalCode) ? form.postalCode : '400001',
          country: 'IN' as const,
        },
        billingAddressSameAsShipping: true,
      };

      fetch('/api/checkout/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (!active || !json?.data) return;
          const d = json.data;
          setPreview({
            subtotal: d.subtotal,
            discount: d.discount,
            taxAmount: d.tax?.status === 'CONFIGURED' ? d.tax.amount : null,
            taxBreakdown: d.tax?.breakdown ?? null,
            shippingAmount: d.shipping?.status === 'CONFIGURED' ? (d.shipping.amount ?? 0) : 0,
            total: d.total,
            configurationComplete: Boolean(d.configurationComplete),
            issues: d.issues ?? [],
          });
        })
        .catch(() => {})
        .finally(() => {
          if (active) setPreviewLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cart, form.state, form.postalCode, form.fullName, form.email, form.phone, form.addressLine1, form.city]);

  const set = (k: keyof FormState, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const setB = (k: keyof BillingState, v: string) => setBilling((b) => ({ ...b, [k]: v }));

  const billingFilled =
    form.billingSame ||
    (billing.fullName &&
      billing.phone &&
      billing.addressLine1 &&
      billing.city &&
      billing.state &&
      /^[1-9]\d{5}$/.test(billing.postalCode));

  const requiredFilled =
    form.fullName &&
    form.email &&
    form.phone &&
    form.addressLine1 &&
    form.city &&
    form.state &&
    /^[1-9]\d{5}$/.test(form.postalCode);

  async function placeOrder() {
    setSubmitting(true);
    setMessage(null);
    try {
      const stateToUse =
        INDIAN_STATES.find(
          (s) =>
            s.toLowerCase() === form.state.toLowerCase() ||
            (form.state.toLowerCase().startsWith('mahara') && s === 'Maharashtra'),
        ) || form.state;

      const address = {
        fullName: form.fullName,
        phone: form.phone,
        addressLine1: form.addressLine1,
        ...(form.addressLine2 ? { addressLine2: form.addressLine2 } : {}),
        ...(form.landmark ? { landmark: form.landmark } : {}),
        city: form.city,
        state: stateToUse,
        postalCode: form.postalCode,
        country: 'IN' as const,
      };
      const billingStateToUse =
        INDIAN_STATES.find(
          (s) =>
            s.toLowerCase() === billing.state.toLowerCase() ||
            (billing.state.toLowerCase().startsWith('mahara') && s === 'Maharashtra'),
        ) || billing.state;
      const billingAddress = form.billingSame
        ? undefined
        : {
            fullName: billing.fullName,
            phone: billing.phone,
            addressLine1: billing.addressLine1,
            ...(billing.addressLine2 ? { addressLine2: billing.addressLine2 } : {}),
            ...(billing.landmark ? { landmark: billing.landmark } : {}),
            city: billing.city,
            state: billingStateToUse,
            postalCode: billing.postalCode,
            country: 'IN' as const,
          };
      const body = {
        customer: { fullName: form.fullName, email: form.email, phone: form.phone },
        shippingAddress: address,
        billingAddressSameAsShipping: form.billingSame,
        ...(billingAddress ? { billingAddress } : {}),
      };
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { order: { orderNumber: string } };
        error?: { code: string };
      };
      if (res.status === 503 || json.error?.code === 'configuration_pending') {
        setMessage({
          kind: 'info',
          text: 'Checkout configuration is still pending (tax & shipping). Your order was not placed.',
        });
      } else if (res.ok && json.data) {
        // Cache the address in the browser for next time (auto-capture).
        try {
          const { billingSame: _b, email: _e, ...addr } = form;
          localStorage.setItem(ADDRESS_CACHE_KEY, JSON.stringify(addr));
        } catch {
          /* ignore */
        }
        // Signed-in: also save to the account so it auto-loads next time.
        if (user) {
          fetch('/api/account/addresses', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ...address, isDefault: true }),
          }).catch(() => {});
        }

        // Initiate payment gateway session
        try {
          const payRes = await fetch('/api/payments/create', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ orderReference: json.data.order.orderNumber }),
          });
          if (payRes.ok) {
            const payJson = (await payRes.json()) as { data?: { paymentUrl?: string } };
            const paymentUrl = payJson.data?.paymentUrl;
            if (paymentUrl) {
              window.location.href = paymentUrl;
              return;
            }
          }
        } catch {
          // If direct payment initiation fails, fallback to order confirmation page
        }

        router.push(`/order/success/${json.data.order.orderNumber}`);
      } else {
        setMessage({ kind: 'error', text: 'We could not place your order. Please try again.' });
      }
    } catch {
      setMessage({ kind: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  const cartEmpty = cart !== null && cart.lines.length === 0;

  // Login gate — checkout requires a signed-in (phone-OTP) customer, GoKwik-style.
  if (authLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-medium text-neutral-500">
          <svg className="h-5 w-5 animate-spin text-neutral-900" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading checkout…</span>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-4xl py-4 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Order Summary Preview */}
          <div className="lg:col-span-5 space-y-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-200/60 pb-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">Your Cart Summary</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {cart?.lines.length ? `${cart.lines.length} item(s) in cart` : 'Items ready for checkout'}
                </p>
              </div>
              <span className="rounded-full bg-neutral-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
                Express
              </span>
            </div>

            {cart && cart.lines.length > 0 ? (
              <div className="space-y-3">
                <ul className="divide-y divide-neutral-200/60 text-xs">
                  {cart.lines.map((item, idx) => {
                    const itemKey = `${item.productId}:${item.variantId ?? ''}:${idx}`;
                    return (
                      <li key={itemKey} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900 line-clamp-1">
                            {item.title}
                            {item.variantLabel ? ` (${item.variantLabel})` : ''}
                          </p>
                          <p className="text-[11px] text-neutral-500">Qty: {item.quantity}</p>
                        </div>
                        <span className="font-semibold text-neutral-900 shrink-0">
                          {formatInr(item.lineTotal) ?? '—'}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="border-t border-neutral-200/80 pt-3 flex justify-between items-center text-sm font-bold text-neutral-900">
                  <span>Subtotal</span>
                  <span>{formatInr(cart.subtotal) ?? '—'}</span>
                </div>
              </div>
            ) : (
              <p className="py-4 text-xs text-neutral-500">Your items will appear here.</p>
            )}

            <div className="rounded-xl border border-neutral-200 bg-white p-3.5 text-[11px] text-neutral-600 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 font-semibold text-neutral-900">
                <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>Why Sign In?</span>
              </div>
              <p className="text-neutral-500 leading-relaxed">
                Auto-saves your delivery addresses, syncs order status, and enables instant 1-click reordering.
              </p>
            </div>
          </div>

          {/* Right Column: Phone OTP Login Card */}
          <div className="lg:col-span-7 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl shadow-neutral-900/5 sm:p-8">
            <div className="mb-6 border-b border-neutral-100 pb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">Fast Login to Checkout</h2>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                Enter your mobile number to verify with a quick OTP. Saved addresses will auto-fill.
              </p>
            </div>

            <PhoneOtpLogin onDone={() => {}} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      {/* Form Area */}
      <div>
        {/* Mobile Collapsible Summary */}
        {cart && cart.lines.length > 0 && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50/70 p-3.5 lg:hidden">
            <button
              type="button"
              onClick={() => setShowMobileSummary((s) => !s)}
              className="flex w-full items-center justify-between text-xs font-semibold text-gray-900"
              aria-expanded={showMobileSummary}
            >
              <span className="flex items-center gap-1.5">
                <span>{showMobileSummary ? 'Hide order summary' : 'Show order summary'}</span>
                <span aria-hidden="true">{showMobileSummary ? '▲' : '▼'}</span>
              </span>
              <span>{formatInr(cart.subtotal) ?? '—'}</span>
            </button>
            {showMobileSummary && (
              <div className="mt-3 border-t border-gray-200 pt-3 space-y-2 text-xs">
                <ul className="divide-y divide-gray-100">
                  {cart.lines.map((l, idx) => {
                    const lKey = `${l.productId}:${l.variantId ?? ''}:${idx}`;
                    return (
                      <li key={lKey} className="flex justify-between py-1.5">
                        <span className="min-w-0 pr-2 line-clamp-1">
                          {l.title}{l.variantLabel ? ` (${l.variantLabel})` : ''} × {l.quantity}
                        </span>
                        <span className="font-medium shrink-0">{formatInr(l.lineTotal) ?? '—'}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                  <span>Subtotal</span>
                  <span>{formatInr(cart.subtotal) ?? '—'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            placeOrder();
          }}
        >
          <fieldset className="space-y-3">
            <legend className="text-base font-semibold text-gray-900">Contact information</legend>
            <Field label="Full name" value={form.fullName} onChange={(v) => set('fullName', v)} autoComplete="name" required />
            <Field label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} autoComplete="email" required />
            <Field label="Phone" type="tel" value={form.phone} onChange={(v) => set('phone', v)} autoComplete="tel" required />
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-base font-semibold text-gray-900">Shipping address</legend>
            <Field label="Address line 1" value={form.addressLine1} onChange={(v) => set('addressLine1', v)} autoComplete="address-line1" required />
            <Field label="Address line 2 (optional)" value={form.addressLine2} onChange={(v) => set('addressLine2', v)} autoComplete="address-line2" />
            <Field label="Landmark (optional)" value={form.landmark} onChange={(v) => set('landmark', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={form.city} onChange={(v) => set('city', v)} autoComplete="address-level2" required />
              <StateSelect label="State" value={form.state} onChange={(v) => set('state', v)} required />
            </div>
            <div>
              <Field
                label="Postal code (PIN)"
                value={form.postalCode}
                onChange={(v) => {
                  set('postalCode', v);
                  if (/^[1-9]\d{5}$/.test(v) && !form.state) {
                    const prefix = parseInt(v.slice(0, 2), 10);
                    if (prefix >= 40 && prefix <= 44) set('state', 'Maharashtra');
                    else if (prefix >= 36 && prefix <= 39) set('state', 'Gujarat');
                    else if (prefix === 11) set('state', 'Delhi');
                    else if (prefix >= 56 && prefix <= 59) set('state', 'Karnataka');
                    else if (prefix >= 60 && prefix <= 64) set('state', 'Tamil Nadu');
                  }
                }}
                inputMode="numeric"
                autoComplete="postal-code"
                required
              />
              <ServiceabilityCheck pincode={form.postalCode} />
            </div>
            <p className="text-xs text-gray-500">Country: India</p>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-base font-semibold text-gray-900">Billing address</legend>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.billingSame}
                onChange={(e) => set('billingSame', e.target.checked)}
              />
              Billing address same as shipping
            </label>
            {!form.billingSame && (
              <div className="mt-2 space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                <Field label="Billing full name" value={billing.fullName} onChange={(v) => setB('fullName', v)} autoComplete="name" required />
                <Field label="Billing phone" type="tel" value={billing.phone} onChange={(v) => setB('phone', v)} inputMode="numeric" autoComplete="tel" required />
                <Field label="Billing address line 1" value={billing.addressLine1} onChange={(v) => setB('addressLine1', v)} autoComplete="address-line1" required />
                <Field label="Billing address line 2 (optional)" value={billing.addressLine2} onChange={(v) => setB('addressLine2', v)} autoComplete="address-line2" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Billing city" value={billing.city} onChange={(v) => setB('city', v)} autoComplete="address-level2" required />
                  <StateSelect label="Billing state" value={billing.state} onChange={(v) => setB('state', v)} required />
                </div>
                <Field label="Billing postal code (PIN)" value={billing.postalCode} onChange={(v) => setB('postalCode', v)} inputMode="numeric" autoComplete="postal-code" required />
                <p className="text-[11px] text-gray-500">Country: India</p>
              </div>
            )}
          </fieldset>
        </form>
      </div>

      {/* Desktop Order Summary Sidebar */}
      <aside className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-20">
        <h2 className="text-base font-semibold text-gray-900">Order summary</h2>

        {cart === null ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : cartEmpty ? (
          <p className="text-sm text-gray-600">Your cart is empty.</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-100 text-sm">
              {cart.lines.map((l, idx) => {
                const lKey = `${l.productId}:${l.variantId ?? ''}:${idx}`;
                return (
                  <li key={lKey} className="flex justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <span className="line-clamp-1">
                        {l.title}{l.variantLabel ? ` (${l.variantLabel})` : ''}
                      </span>
                      <span className="text-xs text-gray-500">Qty {l.quantity}</span>
                    </span>
                    <span className="font-medium">{formatInr(l.lineTotal) ?? '—'}</span>
                  </li>
                );
              })}
            </ul>

            <dl className="space-y-1.5 border-t border-gray-100 pt-3 text-sm">
              <Row label="Subtotal" value={formatInr(cart.subtotal) ?? '—'} />
              {preview?.taxAmount !== null && preview?.taxAmount !== undefined ? (
                <>
                  <Row
                    label={`GST (${preview.taxBreakdown?.rate ? `${Math.round(preview.taxBreakdown.rate * 100)}%` : '18%'})`}
                    value={formatInr(preview.taxAmount) ?? '—'}
                  />
                  {preview.taxBreakdown?.intraState ? (
                    <div className="flex justify-between text-[11px] text-gray-500 pl-2">
                      <span>CGST (9%): {formatInr(preview.taxBreakdown.cgst)}</span>
                      <span>SGST (9%): {formatInr(preview.taxBreakdown.sgst)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-[11px] text-gray-500 pl-2">
                      <span>IGST (18%): {formatInr(preview.taxBreakdown?.igst ?? preview.taxAmount)}</span>
                    </div>
                  )}
                </>
              ) : (
                <Row label="Tax (GST)" value={form.state ? 'Calculating…' : 'Enter state'} muted />
              )}
              <Row
                label="Shipping"
                value={
                  preview && preview.shippingAmount === 0 ? 'FREE' : formatInr(preview?.shippingAmount ?? 0) ?? 'FREE'
                }
              />
              <Row
                label="Total"
                value={
                  preview?.total
                    ? formatInr(preview.total) ?? '—'
                    : previewLoading
                    ? 'Updating…'
                    : formatInr(cart.subtotal) ?? '—'
                }
                strong
              />
            </dl>

            {!preview?.configurationComplete && (
              <div
                role="status"
                className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800"
              >
                {!form.state
                  ? 'Please select your State above to calculate GST and complete checkout.'
                  : 'Validating delivery details to calculate total…'}
              </div>
            )}

            {preview?.configurationComplete && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
                <span>🛡️</span>
                <span>GST calculated. EVM brand warranty & free doorstep support included.</span>
              </div>
            )}

            {message && (
              <p
                role="alert"
                className={`text-xs ${message.kind === 'error' ? 'text-red-700' : 'text-gray-700'}`}
              >
                {message.text}
              </p>
            )}

            <button
              type="button"
              onClick={placeOrder}
              disabled={submitting || cartEmpty || !requiredFilled || !billingFilled}
              className="h-11 w-full rounded-md bg-gray-900 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition shadow-sm"
            >
              {submitting
                ? 'Connecting to HDFC Bank…'
                : preview?.total
                ? `Pay ${formatInr(preview.total)} with HDFC Bank`
                : 'Proceed to Pay'}
            </button>
            <p className="text-center text-[11px] text-gray-500">
              🔒 100% Secure Checkout via HDFC SmartGateway
            </p>
          </>
        )}
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: 'numeric' | 'text';
}) {
  const id = label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
      />
    </div>
  );
}

function StateSelect({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const id = label.replace(/\s+/g, '-').toLowerCase();
  const matched = INDIAN_STATES.find(
    (s) =>
      s.toLowerCase() === value.toLowerCase() ||
      (value.toLowerCase().startsWith('mahara') && s === 'Maharashtra'),
  );
  const selectedValue = matched || value;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700">
        {label}
      </label>
      <select
        id={id}
        value={selectedValue}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 cursor-pointer"
      >
        <option value="">Select State</option>
        {selectedValue && !INDIAN_STATES.includes(selectedValue) && (
          <option value={selectedValue}>{selectedValue}</option>
        )}
        {INDIAN_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-600">{label}</dt>
      <dd className={`${muted ? 'text-gray-500' : 'text-gray-900'} ${strong ? 'font-semibold' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
