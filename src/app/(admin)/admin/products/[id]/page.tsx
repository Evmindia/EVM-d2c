import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { docIdSchema } from '@/lib/validation/catalog';
import { adminGetProduct } from '@/services/catalog/product.service';
import { ProductEditor } from '@/components/admin/ProductEditor';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Edit Product — Admin',
};

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsed = docIdSchema.safeParse(id);
  if (!parsed.success) notFound();

  const product = await adminGetProduct(parsed.data);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <ProductEditor initialProduct={product} mode="edit" />
    </div>
  );
}
