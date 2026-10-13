import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { OrderSuccessClient } from '@/components/shop/OrderSuccessClient';

export const metadata: Metadata = {
  title: 'Order confirmation',
  robots: { index: false, follow: false },
};

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <Container className="py-8">
      <Breadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Orders', path: '/account/orders' },
          { name: reference, path: `/order/success/${reference}` },
        ]}
      />
      <h1 className="mt-4 text-xl font-semibold text-gray-900">Thank you</h1>
      <div className="mt-6 max-w-lg">
        <OrderSuccessClient reference={reference} />
      </div>
    </Container>
  );
}
