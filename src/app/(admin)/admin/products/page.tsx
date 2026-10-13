'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatInr } from '@/lib/format';
import { useAdminData } from '@/components/admin/useAdminData';

interface AdminProductRow {
  id: string;
  title: string;
  sku: string;
  price: number | null;
  isActive: boolean;
  stockStatus: string;
}

export default function AdminProductsPage() {
  const [nonce, setNonce] = useState(0);
  const { data, loading, error } = useAdminData<{ products: AdminProductRow[] }>(
    `/api/admin/products?limit=100&_=${nonce}`,
  );

  async function toggle(id: string, isActive: boolean) {
    if (!confirm(`${isActive ? 'Activate' : 'Deactivate'} this product?`)) return;
    await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    setNonce((n) => n + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Products</h1>
        <Link href="/admin/products/new" className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white">
          New product
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : !data || data.products.length === 0 ? (
        <p className="text-sm text-gray-500">
          No products yet. Create one via the product API / form (data comes from the database, never
          hardcoded).
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="py-2">Title</th>
                <th>SKU</th>
                <th className="text-right">Price</th>
                <th>Stock</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">
                    <Link href={`/admin/products/${p.id}`} className="hover:underline">
                      {p.title}
                    </Link>
                  </td>
                  <td className="text-gray-600">{p.sku}</td>
                  <td className="text-right">{formatInr(p.price) ?? '—'}</td>
                  <td className="text-gray-600">{p.stockStatus.replace(/_/g, ' ')}</td>
                  <td>{p.isActive ? 'Yes' : 'No'}</td>
                  <td className="text-right">
                    <button type="button" onClick={() => toggle(p.id, !p.isActive)} className="text-xs underline">
                      {p.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
