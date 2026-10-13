import { Badge } from '@/components/ui/Badge';
import { STOCK_LABEL } from '@/lib/format';
import type { StockStatus } from '@/types/catalog';

export function AvailabilityBadge({ status }: { status: StockStatus }) {
  const tone = status === 'in_stock' ? 'success' : status === 'preorder' ? 'warning' : 'danger';
  return <Badge tone={tone}>{STOCK_LABEL[status] ?? 'Unavailable'}</Badge>;
}
