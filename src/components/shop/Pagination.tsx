import Link from 'next/link';

/**
 * Cursor-based "next page" control (server component). Only forward paging is
 * offered for the pilot (cursor pagination); it appears only when a next page
 * exists. Preserves existing filter/sort query params.
 */
export function Pagination({
  nextCursor,
  baseQuery,
}: {
  nextCursor: string | null;
  baseQuery: Record<string, string | undefined>;
}) {
  if (!nextCursor) return null;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(baseQuery)) {
    if (v && k !== 'cursor') params.set(k, v);
  }
  params.set('cursor', nextCursor);
  return (
    <div className="flex justify-center pt-6">
      <Link
        href={`/products?${params.toString()}`}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
      >
        Load more
      </Link>
    </div>
  );
}
