import { ProductCard } from './ProductCard';
import type { PublicProduct } from '@/types/catalog';

/** Responsive, aesthetic product grid (1-2 cols on mobile → 3 on tablet → 4 on desktop). */
export function ProductGrid({ products }: { products: PublicProduct[] }) {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
