import type { RatingSummary as RatingSummaryType } from '@/types/catalog';

/**
 * Shows a rating summary from REAL data only. When there are no ratings yet
 * (count 0 / average null), it renders nothing rather than a fake star score.
 */
export function RatingSummary({ rating }: { rating: RatingSummaryType }) {
  if (rating.average === null || rating.count === 0) {
    return <p className="text-xs text-neutral-400">No ratings yet</p>;
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-neutral-700">
      <span className="flex items-center gap-0.5 font-semibold text-amber-500">
        <span aria-hidden="true" className="text-sm">★</span>
        <span>{rating.average.toFixed(1)}</span>
      </span>
      <span className="sr-only">out of 5 stars</span>
      <span className="text-neutral-400">·</span>
      <span className="text-neutral-500">({rating.count.toLocaleString('en-IN')} reviews)</span>
    </div>
  );
}
