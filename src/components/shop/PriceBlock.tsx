import { formatInr } from '@/lib/format';
import { discountPercent } from '@/services/catalog/product.service';

/**
 * Renders price / MRP / discount from REAL values only. When price is null
 * (not yet provided by EVM), shows "Price coming soon" instead of a number.
 * Never fabricates a price, MRP, or discount.
 */
export function PriceBlock({
  price,
  mrp,
  size = 'md',
}: {
  price: number | null;
  mrp: number | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const priceText = formatInr(price);
  const mrpText = formatInr(mrp);
  const discount = discountPercent(price, mrp);

  const priceSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg';

  if (priceText === null) {
    return <p className="text-sm text-gray-500">Price coming soon</p>;
  }

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className={`font-semibold text-gray-900 ${priceSize}`}>{priceText}</span>
      {mrpText && discount !== null && (
        <>
          <span className="text-sm text-gray-500 line-through" aria-label="Maximum retail price">
            {mrpText}
          </span>
          <span className="text-sm font-medium text-green-700">{discount}% off</span>
        </>
      )}
    </div>
  );
}
