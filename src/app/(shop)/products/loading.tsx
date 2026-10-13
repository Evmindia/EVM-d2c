import { Container } from '@/components/ui/Container';

/** Skeleton loading state for the product listing (no fabricated content). */
export default function LoadingProducts() {
  return (
    <Container className="py-6">
      <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200">
            <div className="aspect-square animate-pulse rounded-t-lg bg-gray-100" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
