import Link from 'next/link';

/**
 * Clean empty state — shown when catalog data is not yet available. It never
 * invents products; it communicates that the catalog is being prepared with a clear CTA.
 */
export function EmptyState({
  title = 'Products coming soon',
  message = 'Our catalog is currently being updated. Please check back shortly.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-gray-50/50 p-10 text-center">
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
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <h2 className="mt-3 text-base font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-xs text-gray-500">{message}</p>
      <div className="mt-6">
        <Link
          href="/products"
          className="inline-block rounded-md bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
        >
          Refresh catalog
        </Link>
      </div>
    </div>
  );
}
