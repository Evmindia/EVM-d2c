'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { ProductImage } from '@/types/catalog';

function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('blob:')) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
}

export function ProductGallery({ images, title }: { images: ProductImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const [galleryImages, setGalleryImages] = useState<ProductImage[]>(images);

  useEffect(() => {
    setGalleryImages(images);
  }, [images]);

  const validImages = galleryImages.filter((img) => isValidImageUrl(img.url));

  useEffect(() => {
    function onVariantSelect(e: Event) {
      const customEvent = e as CustomEvent<{ label?: string; images?: ProductImage[] }>;
      const variantImages = customEvent.detail?.images;
      const label = customEvent.detail?.label?.toLowerCase();

      // If variant has its own images configured, display them
      if (Array.isArray(variantImages) && variantImages.length > 0) {
        setGalleryImages(variantImages);
        setActive(0);
        return;
      }

      // Otherwise fall back to main product images
      setGalleryImages(images);

      if (label) {
        const defaultValid = images.filter((img) => isValidImageUrl(img.url));
        const idx = defaultValid.findIndex(
          (img) =>
            img.alt.toLowerCase().includes(label) ||
            img.url.toLowerCase().includes(label),
        );
        if (idx !== -1) {
          setActive(idx);
          return;
        }
      }
      setActive(0);
    }

    window.addEventListener('evm:variant-selected', onVariantSelect);
    return () => window.removeEventListener('evm:variant-selected', onVariantSelect);
  }, [images]);

  if (validImages.length === 0) {
    return (
      <div
        className="flex aspect-square w-full items-center justify-center rounded-2xl bg-neutral-100/70 text-xs uppercase tracking-widest text-neutral-400 font-medium border border-neutral-200/60"
        role="img"
        aria-label={`${title} image coming soon`}
      >
        Image coming soon
      </div>
    );
  }

  const current = validImages[active] ?? validImages[0]!;
  const count = validImages.length;
  const go = (next: number) => setActive(((next % count) + count) % count);

  return (
    <div className="space-y-4">
      {/* Main Hero Image Box */}
      <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-100/60 p-4">
        <Image
          src={current.url}
          alt={current.alt || `${title} - view ${active + 1}`}
          fill
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 780px"
          className="object-contain p-4 transition-transform duration-500 hover:scale-105"
        />

        {count > 1 && (
          <>
            {/* Prev / Next arrows */}
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-md transition hover:bg-white hover:scale-105"
            >
              <ChevronIcon className="h-5 w-5 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-md transition hover:bg-white hover:scale-105"
            >
              <ChevronIcon className="h-5 w-5" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
              {validImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={i === active}
                  className={`h-2 rounded-full transition-all ${
                    i === active ? 'w-6 bg-neutral-900' : 'w-2 bg-neutral-400/60 hover:bg-neutral-600'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail rail if multiple images */}
      {count > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {validImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                i === active ? 'border-neutral-900 ring-2 ring-neutral-900/10' : 'border-neutral-200/80 opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={img.url} alt={img.alt || title} fill className="object-contain p-1" />
            </button>
          ))}
        </div>
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
