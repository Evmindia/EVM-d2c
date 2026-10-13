import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { CheckoutClient } from '@/components/shop/CheckoutClient';
import { absoluteUrl } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Checkout.',
  alternates: { canonical: absoluteUrl('/checkout') },
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <Container className="py-6">
      <h1 className="text-xl font-semibold text-gray-900">Checkout</h1>
      <p className="mt-1 text-sm text-gray-600">Guest checkout — no account required.</p>
      <div className="mt-6">
        <CheckoutClient />
      </div>
    </Container>
  );
}
