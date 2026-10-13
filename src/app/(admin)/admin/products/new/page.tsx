import type { Metadata } from 'next';
import { ProductEditor } from '@/components/admin/ProductEditor';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'New Product — Admin',
};

export default function AdminNewProductPage() {
  return (
    <div className="space-y-6">
      <ProductEditor mode="create" />
    </div>
  );
}
