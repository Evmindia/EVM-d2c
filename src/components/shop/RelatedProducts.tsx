import { ProductGrid } from './ProductGrid';
import type { PublicProduct } from '@/types/catalog';

/** Related products section matching brand aesthetics. */
export function RelatedProducts({ products }: { products: PublicProduct[] }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="space-y-6 pt-6 border-t border-neutral-200/80">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          Discover More
        </p>
        <h2 id="related-heading" className="mt-1 text-2xl font-light tracking-tight text-neutral-900 sm:text-3xl">
          Complete Your Setup
        </h2>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
