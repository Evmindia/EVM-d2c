'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatInr } from '@/lib/format';

/** Slim, serializable slide passed from the server home page. */
export interface HeroSlide {
  slug: string;
  title: string;
  shortDescription: string;
  price: number | null;
  image: { url: string; alt: string } | null;
}

const HEADLINE_LINE_1 = 'Smart Tech,';
const HEADLINE_LINE_2 = 'Smarter Living';
const SUBTEXT =
  'Upgrade your everyday with modern electronics designed for comfort, style, and performance.';
const AUTOPLAY_MS = 6000;

function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('blob:')) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
}

/**
 * Storefront hero carousel. The marketing headline and CTA are fixed; the
 * background image and floating product card rotate through featured products.
 * Renders a clean static hero (no card/arrows/dots) when there are no products
 * — never fabricates imagery or prices.
 */
export function HeroCarousel({
  slides,
  backgroundImage,
  backgroundImageMobile,
}: {
  slides: HeroSlide[];
  /** Fixed lifestyle background (public/ path). When set, it stays put while the
   * floating product card rotates — matching the approved design. */
  backgroundImage?: string;
  /** Optional mobile-specific background (better-framed square/portrait crop).
   * Falls back to `backgroundImage` when omitted. */
  backgroundImageMobile?: string;
}) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex((next % count + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [count, paused]);

  const active = count > 0 ? slides[index] : null;
  const productBg = active?.image && isValidImageUrl(active.image.url) ? active.image.url : null;
  // Fixed lifestyle background wins; otherwise fall back to the active product image.
  const desktopBg = backgroundImage ?? productBg;
  const mobileBg = backgroundImageMobile ?? desktopBg;

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-300 to-stone-500 text-white shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background: mobile-specific crop below `sm`, wide lifestyle image above. */}
      <div className="absolute inset-0">
        {mobileBg || desktopBg ? (
          <>
            {mobileBg && (
              <Image
                key={`m-${mobileBg}`}
                src={mobileBg}
                alt="Featured lifestyle"
                fill
                priority
                sizes="100vw"
                className="object-cover sm:hidden"
              />
            )}
            {desktopBg && (
              <Image
                key={`d-${desktopBg}`}
                src={desktopBg}
                alt="Featured lifestyle"
                fill
                priority
                sizes="100vw"
                className="hidden object-cover sm:block"
              />
            )}
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-stone-400 to-stone-600" aria-hidden="true" />
        )}
        {/* Legibility overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent"
          aria-hidden="true"
        />
      </div>

      {/* Content */}
      <div className="relative flex min-h-[28rem] flex-col justify-between p-6 sm:min-h-[32rem] sm:p-10 lg:min-h-[35rem]">
        <div className="mt-auto max-w-xl">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight drop-shadow-sm sm:text-6xl">
            {HEADLINE_LINE_1}
            <br />
            {HEADLINE_LINE_2}
          </h1>
          <p className="mt-4 max-w-md text-sm text-white/85 sm:text-base">{SUBTEXT}</p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow transition hover:bg-gray-100"
          >
            Shop Now
          </Link>
        </div>

        {/* Dots */}
        {count > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`h-2.5 rounded-full transition-all ${
                  i === index ? 'w-6 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating product card */}
      {active && (
        <Link
          href={`/products/${active.slug}`}
          className="absolute bottom-6 right-6 hidden w-[20rem] items-stretch gap-3 rounded-2xl bg-white p-3 text-gray-900 shadow-lg transition hover:shadow-xl md:flex"
        >
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
            {active.image && isValidImageUrl(active.image.url) ? (
              <Image
                src={active.image.url}
                alt={active.image.alt || active.title}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                No image
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <h3 className="truncate text-sm font-semibold">{active.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{active.shortDescription}</p>
            <span className="mt-auto text-base font-semibold">
              {formatInr(active.price) ?? 'Price coming soon'}
            </span>
          </div>
        </Link>
      )}

      {/* Arrows */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 shadow transition hover:bg-white"
          >
            <ChevronIcon className="h-5 w-5 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 shadow transition hover:bg-white"
          >
            <ChevronIcon className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
