'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Header search pill (client island). Submits to /search?q=... which is
 * rendered server-side (same param the /search page reads). Collapses to an
 * icon-only link on small screens.
 */
export function HeaderSearch() {
  const router = useRouter();
  const [value, setValue] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim().slice(0, 80);
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  return (
    <>
      {/* Compact pill on md+ screens */}
      <form
        role="search"
        onSubmit={submit}
        className="hidden items-center gap-2 rounded-full bg-gray-100 px-4 py-2 transition focus-within:bg-gray-200/70 md:flex"
      >
        <SearchIcon className="h-4 w-4 shrink-0 text-gray-500" />
        <label htmlFor="header-search" className="sr-only">
          Search products
        </label>
        <input
          id="header-search"
          type="search"
          value={value}
          maxLength={80}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search"
          className="w-32 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 lg:w-56"
        />
      </form>

      {/* Icon-only link on small screens */}
      <button
        type="button"
        onClick={() => router.push('/search')}
        aria-label="Search"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 md:hidden"
      >
        <SearchIcon className="h-5 w-5" />
      </button>
    </>
  );
}

function SearchIcon({ className }: { className?: string }) {
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
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
