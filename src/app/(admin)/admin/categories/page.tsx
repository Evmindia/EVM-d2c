'use client';

import { useState } from 'react';
import { useAdminData } from '@/components/admin/useAdminData';

interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export default function AdminCategoriesPage() {
  const [nonce, setNonce] = useState(0);
  const { data, loading } = useAdminData<{ categories: Category[] }>(
    `/api/admin/categories?_=${nonce}`,
  );
  const [form, setForm] = useState({ name: '', slug: '', description: '', sortOrder: '0' });
  const [msg, setMsg] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        description: form.description,
        image: null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: true,
        seo: {},
      }),
    });
    if (res.ok) {
      setForm({ name: '', slug: '', description: '', sortOrder: '0' });
      setNonce((n) => n + 1);
    } else {
      setMsg(res.status === 403 ? 'Permission denied.' : 'Could not create category (check slug is unique/valid).');
    }
  }

  async function toggle(id: string, isActive: boolean) {
    await fetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    setNonce((n) => n + 1);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Categories</h1>

      {loading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : !data || data.categories.length === 0 ? (
        <p className="text-sm text-gray-500">No categories yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 text-sm">
          {data.categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <span>
                {c.name} <span className="text-gray-400">/{c.slug}</span>
              </span>
              <button
                type="button"
                onClick={() => toggle(c.id, !c.isActive)}
                className="text-xs underline"
              >
                {c.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={create} className="max-w-sm space-y-2 rounded-md border border-gray-200 p-3">
        <h2 className="text-sm font-semibold">New category</h2>
        {msg && <p className="text-sm text-red-700">{msg}</p>}
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" required className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400" />
        <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="slug-like-this" required className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400" />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" required className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400" />
        <input value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} placeholder="Sort order" inputMode="numeric" className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400" />
        <button type="submit" className="h-9 rounded-md bg-gray-900 px-3 text-sm font-semibold text-white">
          Create category
        </button>
      </form>
    </div>
  );
}
