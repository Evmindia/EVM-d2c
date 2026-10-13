import Link from 'next/link';
import { Container } from '@/components/ui/Container';

export default function ProductNotFound() {
  return (
    <Container className="py-20">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-semibold text-gray-900">Product not found</h1>
        <p className="mt-2 text-sm text-gray-600">
          This product may no longer be available.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Browse products
        </Link>
      </div>
    </Container>
  );
}
