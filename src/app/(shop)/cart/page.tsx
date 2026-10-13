import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { CartClient } from '@/components/shop/CartClient';
import { absoluteUrl } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Shopping Bag / Cart | EVM India',
  description: 'Review your selected EVM power banks, headphones, and audio accessories.',
  alternates: { canonical: absoluteUrl('/cart') },
  robots: { index: false, follow: true }, // cart is user-specific, not indexed
};

export default function CartPage() {
  return (
    <Container className="py-6 sm:py-8">
      <Breadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Shopping Bag', path: '/cart' },
        ]}
      />
      <h1 className="mt-4 text-2xl font-serif font-normal tracking-tight text-neutral-900 sm:text-3xl">
        Shopping Bag
      </h1>
      <div className="mt-6">
        <CartClient />
      </div>
    </Container>
  );
}

