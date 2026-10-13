'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

/**
 * Search input (client island). Submits to /search?q=... which is rendered
 * server-side. Includes quick-clear button when text is present.
 */
export function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim().slice(0, 80);
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function clear() {
    setValue('');
  }

  return (
    <form role="search" onSubmit={submit} className="flex gap-2">
      <label htmlFor="q" className="sr-only">
        Search products
      </label>
      <div className="relative flex-1">
        <input
          id="q"
          name="q"
          type="search"
          value={value}
          maxLength={80}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search products by name, category, or brand"
          className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700"
            aria-label="Clear search input"
          >
            ✕
          </button>
        )}
      </div>
      <button
        type="submit"
        className="h-10 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
      >
        Search
      </button>
    </form>
  );
}
