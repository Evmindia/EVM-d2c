import Link from 'next/link';
import Image from 'next/image';
import { PriceBlock } from './PriceBlock';
import { RatingSummary } from './RatingSummary';
import { AvailabilityBadge } from './AvailabilityBadge';
import type { PublicProduct } from '@/types/catalog';

function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('blob:')) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
}

/**
 * Premium D2C Product Card with smooth hover elevation, image zoom,
 * clean typography, and warm aesthetic accents.
 */
export function ProductCard({ product }: { product: PublicProduct }) {
  const img = product.thumbnail ?? product.images[0] ?? null;
  const hasValidImg = img && isValidImageUrl(img.url);

  return (
    <article className="group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-neutral-300 hover:shadow-xl focus-within:ring-2 focus-within:ring-neutral-900">
      <Link
        href={`/products/${product.slug}`}
        className="flex h-full flex-col outline-none"
        aria-label={product.title}
      >
        {/* Image Container */}
        <div className="relative aspect-square w-full overflow-hidden bg-neutral-100/70 p-4">
          {hasValidImg ? (
            <Image
              src={img.url}
              alt={img.alt || product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-xs font-medium uppercase tracking-widest text-neutral-400"
              aria-hidden="true"
            >
              Image coming soon
            </div>
          )}

          {/* Availability overlay tag */}
          <div className="absolute top-3 left-3 z-10">
            <AvailabilityBadge status={product.stockStatus} />
          </div>
        </div>

        {/* Details Container */}
        <div className="flex flex-1 flex-col justify-between space-y-3 p-5">
          <div>
            <h3 className="line-clamp-2 min-h-[2.5rem] text-base font-medium tracking-tight text-neutral-900 leading-snug transition group-hover:text-neutral-700">
              {product.title}
            </h3>
            <div className="mt-2 min-h-[1.25rem]">
              <RatingSummary rating={product.rating} />
            </div>
          </div>

          <div className="flex items-end justify-between pt-2 border-t border-neutral-100">
            <div>
              <PriceBlock price={product.price} mrp={product.mrp} size="sm" />
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-900 transition-colors group-hover:bg-neutral-900 group-hover:text-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
