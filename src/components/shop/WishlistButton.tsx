'use client';

import Link from 'next/link';

/**
 * Header wishlist (favourites) entry point. A dedicated wishlist feature does
 * not exist yet, so this links to the account area rather than fabricating a
 * route. Swap the href when the wishlist page ships.
 */
export function WishlistButton() {
  return (
    <Link
      href="/account"
      aria-label="Wishlist"
      title="Wishlist"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 hover:text-gray-900"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    </Link>
  );
}
