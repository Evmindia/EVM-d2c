'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { PublicCategory } from '@/types/catalog';

/**
 * Premium catalog filter pills + sort dropdown.
 * Updates URL search params cleanly while maintaining server component rendering.
 */
export function CatalogControls({
  categories,
  itemCount,
}: {
  categories: PublicCategory[];
  itemCount?: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const currentCategory = params.get('category') ?? '';
  const currentSort = params.get('sort') ?? 'newest';

  const selectedCategoryObj = categories.find((c) => c.slug === currentCategory);
  const hasActiveFilters = Boolean(currentCategory) || currentSort !== 'newest';

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('cursor'); // reset pagination on filter/sort change
    router.push(`/products?${next.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* Category Pills + Sort Row */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            suppressHydrationWarning
            type="button"
            onClick={() => update('category', '')}
            className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-widest transition-all ${
              !currentCategory
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-white/80 text-neutral-600 border border-neutral-200 hover:border-neutral-400 hover:text-neutral-900'
            }`}
          >
            All Products
          </button>
          {categories.map((c) => {
            const active = currentCategory === c.slug;
            return (
              <button
                suppressHydrationWarning
                key={c.id}
                type="button"
                onClick={() => update('category', c.slug)}
                className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-widest transition-all ${
                  active
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white/80 text-neutral-600 border border-neutral-200 hover:border-neutral-400 hover:text-neutral-900'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Right side: Sort + Item count */}
        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
          {typeof itemCount === 'number' && (
            <span className="text-xs font-medium text-neutral-500">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          )}

          <div className="relative flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 hidden sm:inline">
              Sort:
            </span>
            <select
              suppressHydrationWarning
              id="sort"
              value={currentSort}
              aria-label="Sort products"
              onChange={(e) => update('sort', e.target.value)}
              className="h-9 rounded-full border border-neutral-300 bg-white px-4 pr-8 text-xs font-medium text-neutral-800 outline-none transition hover:border-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23404040' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1rem',
              }}
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filters Row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-200/60">
          <span className="text-xs font-medium text-neutral-400">Active filters:</span>
          {selectedCategoryObj && (
            <button
              suppressHydrationWarning
              type="button"
              onClick={() => update('category', '')}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-neutral-800"
            >
              <span>{selectedCategoryObj.name}</span>
              <span aria-hidden="true" className="text-white/60">✕</span>
            </button>
          )}
          {currentSort !== 'newest' && (
            <button
              suppressHydrationWarning
              type="button"
              onClick={() => update('sort', 'newest')}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-neutral-800"
            >
              <span>
                {currentSort === 'price_asc' ? 'Price: Low to High' : 'Price: High to Low'}
              </span>
              <span aria-hidden="true" className="text-white/60">✕</span>
            </button>
          )}
          <Link
            href="/products"
            className="ml-2 text-xs font-medium text-neutral-500 underline underline-offset-4 hover:text-neutral-900 transition"
          >
            Clear all
          </Link>
        </div>
      )}
    </div>
  );
}
