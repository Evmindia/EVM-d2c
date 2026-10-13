'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatInr } from '@/lib/format';
import { CART_MAX_QTY_PER_ITEM } from '@/services/cart/cart.types';
import { notifyCartUpdated } from '@/lib/cart/cart-events';
import type { CartView } from '@/services/cart/cart.types';

/**
 * Interactive cart (client island). All mutations call the server and re-render
 * from the SERVER response — never from optimistic local math. Prices, line
 * totals, and subtotal are always the server-calculated values.
 */
export function CartClient() {
  const [view, setView] = useState<CartView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((v: CartView) => {
    setView(v);
    notifyCartUpdated(v.itemCount);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/cart', { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { data: CartView };
      setView(json.data);
    } catch {
      setError('Could not load your cart.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function mutate(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { data: CartView };
      apply(json.data);
    } catch {
      setError('Update failed. Please try again.');
      await load();
    } finally {
      setBusy(false);
    }
  }

  const setQty = (productId: string, quantity: number, variantId?: string | null) => {
    const url = variantId
      ? `/api/cart/items/${encodeURIComponent(productId)}?variantId=${encodeURIComponent(variantId)}`
      : `/api/cart/items/${encodeURIComponent(productId)}`;
    return mutate(url, 'PATCH', { quantity, variantId });
  };
  const remove = (productId: string, variantId?: string | null) => {
    const url = variantId
      ? `/api/cart/items/${encodeURIComponent(productId)}?variantId=${encodeURIComponent(variantId)}`
      : `/api/cart/items/${encodeURIComponent(productId)}`;
    return mutate(url, 'DELETE');
  };
  const clear = () => mutate('/api/cart', 'DELETE');

  if (view === null) {
    return <CartSkeleton />;
  }

  if (view.lines.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-10 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
        <h2 className="mt-3 text-base font-semibold text-gray-900">Your cart is empty</h2>
        <p className="mt-1 text-sm text-gray-500">Looks like you haven&apos;t added any items yet.</p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        {/* Cart Line Items */}
        <div className="space-y-4">
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-4 sm:px-6">
            {view.lines.map((line, index) => {
              const lineKey = `${line.productId}:${line.variantId ?? ''}:${index}`;
              return (
                <li key={lineKey} className="flex gap-4 py-5">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {line.thumbnailUrl ? (
                      <Image
                        src={line.thumbnailUrl}
                        alt={line.thumbnailAlt}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-gray-400">
                        No image
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        {line.slug ? (
                          <Link
                            href={`/products/${line.slug}`}
                            className="line-clamp-2 text-sm font-medium text-gray-900 hover:underline"
                          >
                            {line.title}
                          </Link>
                        ) : (
                          <span className="text-sm font-medium text-gray-900">{line.title}</span>
                        )}
                        {line.variantLabel && (
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-600">
                            {line.variantType === 'color' && line.variantValue && (
                              <span
                                className="inline-block h-3.5 w-3.5 rounded-full border border-neutral-300 shadow-2xs shrink-0"
                                style={{ backgroundColor: line.variantValue }}
                                aria-hidden="true"
                              />
                            )}
                            <span className="font-medium text-neutral-700">
                              {line.variantType ? `${line.variantType.charAt(0).toUpperCase() + line.variantType.slice(1)}: ` : ''}
                              {line.variantLabel}
                            </span>
                          </div>
                        )}
                        <p className="mt-0.5 text-xs text-gray-500">
                          {formatInr(line.unitPrice) ?? 'Price unavailable'}
                        </p>
                        {!line.available && (
                          <p className="mt-0.5 text-xs text-red-600">Currently unavailable</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.productId, line.variantId)}
                        disabled={busy}
                        className="h-8 shrink-0 text-xs text-gray-500 underline hover:text-gray-900 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <span>Qty</span>
                        <select
                          value={line.quantity}
                          onChange={(e) => setQty(line.productId, Number(e.target.value), line.variantId)}
                          disabled={busy}
                          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
                          aria-label={`Quantity for ${line.title}${line.variantLabel ? ` (${line.variantLabel})` : ''}`}
                        >
                          {Array.from({ length: CART_MAX_QTY_PER_ITEM }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatInr(line.lineTotal) ?? '—'}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex justify-between px-1">
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="text-xs text-gray-500 underline hover:text-gray-900 disabled:opacity-50"
            >
              Clear shopping cart
            </button>
          </div>
        </div>

        {/* Order Summary Card */}
        <aside className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-20">
          <h2 className="text-base font-semibold text-gray-900">Order Summary</h2>

          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-sm text-gray-600">Subtotal</span>
            <span className="text-lg font-semibold text-gray-900">
              {formatInr(view.subtotal) ?? '—'}
            </span>
          </div>

          <p className="text-xs text-gray-500">
            Taxes and shipping are calculated at checkout.
          </p>

          <div className="space-y-2 pt-2">
            <Link
              href="/checkout"
              className="flex h-11 w-full items-center justify-center rounded-md bg-gray-900 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Proceed to checkout
            </Link>
            <Link
              href="/products"
              className="flex h-11 w-full items-center justify-center rounded-md border border-gray-300 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start animate-pulse">
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-4 py-3">
            <div className="h-20 w-20 rounded-lg bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-1/4 rounded bg-gray-200" />
              <div className="h-4 w-1/3 rounded bg-gray-200 mt-2" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="h-5 w-1/2 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-11 w-full rounded bg-gray-200" />
      </div>
    </div>
  );
}
