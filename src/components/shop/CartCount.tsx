'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CART_UPDATED_EVENT } from '@/lib/cart/cart-events';

/**
 * Header cart link with a live item count (client island). Fetches the
 * authoritative count from GET /api/cart on mount and updates when a
 * cart-updated event fires. The count always reflects a server response.
 */
export function CartCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch('/api/cart', { headers: { accept: 'application/json' } });
        if (!res.ok) return;
        const json = (await res.json()) as { data: { itemCount: number } };
        if (active) setCount(json.data.itemCount);
      } catch {
        /* ignore; leave count unknown */
      }
    }
    load();

    function onUpdate(e: Event) {
      const detail = (e as CustomEvent<{ itemCount: number }>).detail;
      if (detail && typeof detail.itemCount === 'number') setCount(detail.itemCount);
    }
    window.addEventListener(CART_UPDATED_EVENT, onUpdate);
    return () => {
      active = false;
      window.removeEventListener(CART_UPDATED_EVENT, onUpdate);
    };
  }, []);

  return (
    <Link
      href="/cart"
      aria-label="Cart"
      className="relative flex h-10 w-10 items-center justify-center text-white/90 transition hover:text-white"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="18" cy="20" r="1.4" />
        <path d="M2 3h2l2.2 12.2a1.5 1.5 0 0 0 1.5 1.3h9.1a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
      </svg>
      {count !== null && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-neutral-900">
          {count}
        </span>
      )}
      <span className="sr-only"> items in cart</span>
    </Link>
  );
}
