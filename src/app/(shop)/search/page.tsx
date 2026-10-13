import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { SearchBox } from '@/components/shop/SearchBox';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { safeSearch } from '@/services/catalog/catalog.read';
import { searchQuerySchema } from '@/lib/validation/catalog';
import { absoluteUrl } from '@/lib/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search Products | EVM India',
  description: 'Search EVM power banks, wireless headphones, earphones, and accessories.',
  alternates: { canonical: absoluteUrl('/search') },
  robots: { index: false, follow: true }, // search results pages are noindex
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawQ = typeof sp.q === 'string' ? sp.q : '';

  // Validate with the same schema as the API; invalid/empty → no query run.
  const parsed = searchQuerySchema.safeParse({ q: rawQ, limit: 20 });
  const results = parsed.success ? await safeSearch(parsed.data.q, parsed.data.limit) : [];
  const hasQuery = parsed.success;

  return (
    <Container className="py-6 sm:py-8">
      <Breadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Search', path: '/search' },
          ...(hasQuery && parsed.data.q ? [{ name: `“${parsed.data.q.slice(0, 30)}”`, path: `/search?q=${encodeURIComponent(parsed.data.q)}` }] : []),
        ]}
      />
      <h1 className="mt-4 text-2xl font-serif font-normal tracking-tight text-neutral-900 sm:text-3xl">
        Search Products
      </h1>
      <div className="mt-4 max-w-xl">
        <SearchBox />
      </div>

      <div className="mt-8">
        {!hasQuery ? (
          <p className="text-sm text-neutral-500">Enter a search keyword to discover EVM power banks, audio gear, and accessories.</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-neutral-600">
            No products found{rawQ ? ` matching “${rawQ.slice(0, 80)}”` : ''}.
          </p>
        ) : (
          <>
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-500">
              Showing {results.length} result{results.length === 1 ? '' : 's'}
            </p>
            <ProductGrid products={results} />
          </>
        )}
      </div>
    </Container>
  );
}

