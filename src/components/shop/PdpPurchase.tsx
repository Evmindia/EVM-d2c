'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CART_MAX_QTY_PER_ITEM } from '@/services/cart/cart.types';
import { notifyCartUpdated } from '@/lib/cart/cart-events';
import { VariantSelector } from './VariantSelector';
import type { ProductVariant } from '@/types/catalog';

interface PdpPurchaseProps {
  productId: string;
  available: boolean;
  variants?: ProductVariant[];
  currentSlug?: string;
}

export function PdpPurchase({
  productId,
  available,
  variants,
  currentSlug,
}: PdpPurchaseProps) {
  const router = useRouter();
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants?.[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<'idle' | 'adding' | 'buying' | 'added' | 'error'>('idle');
  const clamp = (n: number) => Math.min(Math.max(1, n), CART_MAX_QTY_PER_ITEM);

  const selectedVariant = variants?.find((v) => v.id === selectedVariantId) ?? variants?.[0];
  const isVariantInStock = selectedVariant ? selectedVariant.inStock : true;
  const canPurchase = available && isVariantInStock;
  const isBusy = status === 'adding' || status === 'buying';

  async function addToCart() {
    setStatus('adding');
    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId,
          variantId: selectedVariant?.id || undefined,
          quantity: qty,
        }),
      });
      if (!res.ok) throw new Error('add failed');
      const json = (await res.json()) as { data: { itemCount: number } };
      notifyCartUpdated(json.data.itemCount);
      setStatus('added');
    } catch {
      setStatus('error');
    }
  }

  async function buyNow() {
    setStatus('buying');
    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId,
          variantId: selectedVariant?.id || undefined,
          quantity: qty,
        }),
      });
      if (!res.ok) throw new Error('buy now failed');
      const json = (await res.json()) as { data: { itemCount: number } };
      notifyCartUpdated(json.data.itemCount);
      router.push('/checkout');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      {/* Variant Selector */}
      {variants && variants.length > 0 && currentSlug && (
        <VariantSelector
          variants={variants}
          currentSlug={currentSlug}
          selectedId={selectedVariantId}
          onSelect={(v) => setSelectedVariantId(v.id)}
        />
      )}

      {/* Quantity Selector */}
      <div className="flex items-center gap-3">
        <span id="qty-label" className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          Quantity
        </span>
        <div className="inline-flex items-center rounded-full border border-neutral-300 bg-white">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-l-full text-base font-medium text-neutral-700 hover:bg-neutral-100 focus:outline-none disabled:opacity-40"
            onClick={() => setQty((q) => clamp(q - 1))}
            disabled={qty <= 1 || isBusy}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <input
            type="text"
            inputMode="numeric"
            readOnly
            aria-labelledby="qty-label"
            value={qty}
            className="h-9 w-8 border-none bg-transparent text-center text-xs font-semibold text-neutral-900 outline-none"
          />
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-r-full text-base font-medium text-neutral-700 hover:bg-neutral-100 focus:outline-none disabled:opacity-40"
            onClick={() => setQty((q) => clamp(q + 1))}
            disabled={qty >= CART_MAX_QTY_PER_ITEM || isBusy}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={addToCart}
          disabled={!canPurchase || isBusy}
          className="h-12 flex-1 rounded-full border border-neutral-900 bg-white text-xs font-semibold uppercase tracking-widest text-neutral-900 transition hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:opacity-50"
        >
          {status === 'adding' ? 'Adding…' : !isVariantInStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
        <button
          type="button"
          onClick={buyNow}
          disabled={!canPurchase || isBusy}
          className="h-12 flex-1 rounded-full bg-neutral-950 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:opacity-50"
        >
          {status === 'buying' ? 'Processing…' : !isVariantInStock ? 'Out of Stock' : 'Buy Now'}
        </button>
      </div>

      {/* Feedback Banner */}
      {status === 'added' && (
        <div
          role="status"
          className="rounded-2xl border border-green-200 bg-green-50/90 p-4 text-xs text-green-900 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Added to your shopping cart!
            </span>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="text-neutral-400 hover:text-neutral-600"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <Link
              href="/cart"
              className="flex-1 rounded-full bg-neutral-950 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-white hover:bg-neutral-800 transition"
            >
              View Cart
            </Link>
            <Link
              href="/checkout"
              className="flex-1 rounded-full border border-neutral-300 bg-white py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-neutral-900 hover:bg-neutral-50 transition"
            >
              Checkout
            </Link>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-800"
        >
          <span>Could not complete request. Please try again.</span>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="text-xs font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {status === 'idle' && !canPurchase && (
        <p className="text-xs text-neutral-500 font-medium">
          {!available ? 'This product is currently unavailable.' : 'The selected variant is out of stock.'}
        </p>
      )}

      {/* Sticky Mobile Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 p-3.5 backdrop-blur shadow-lg sm:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addToCart}
            disabled={!canPurchase || isBusy}
            className="h-11 flex-1 rounded-full border border-neutral-900 bg-white text-xs font-semibold uppercase tracking-wider text-neutral-900 disabled:opacity-50"
          >
            {status === 'adding' ? 'Adding…' : !isVariantInStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
          <button
            type="button"
            onClick={buyNow}
            disabled={!canPurchase || isBusy}
            className="h-11 flex-1 rounded-full bg-neutral-950 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50"
          >
            {status === 'buying' ? 'Processing…' : !isVariantInStock ? 'Out of Stock' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
