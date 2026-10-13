'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAdminData } from '@/components/admin/useAdminData';
import { getVideoSourceBadge } from '@/lib/media/video-source';

interface ProductTag {
  name: string;
  image: string;
  price: number;
  mrp: number;
  discount: string;
  href: string;
}

interface BrandReel {
  id: string;
  title: string;
  handle: string;
  views: string;
  likes: number;
  shares: number;
  poster: string;
  videoUrl?: string;
  product: ProductTag;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  title: string;
  handle: string;
  views: string;
  likes: number;
  shares: number;
  poster: string;
  videoUrl: string;
  productName: string;
  productImage: string;
  productPrice: number;
  productMrp: number;
  productDiscount: string;
  productHref: string;
  sortOrder: number;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  title: '',
  handle: '@evmzone',
  views: '25.0K',
  likes: 1200,
  shares: 180,
  poster: '/cat-powerbank.jpg',
  videoUrl: '',
  productName: 'Encase MagSafe Power Bank',
  productImage: '/cat-powerbank.jpg',
  productPrice: 1499,
  productMrp: 2999,
  productDiscount: '50% OFF',
  productHref: '/products',
  sortOrder: 0,
  isActive: true,
};

export default function AdminReelsPage() {
  const [nonce, setNonce] = useState(0);
  const { data, loading } = useAdminData<{ reels: BrandReel[] }>(`/api/admin/reels?_=${nonce}`);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (reel: BrandReel) => {
    setEditingId(reel.id);
    setForm({
      title: reel.title,
      handle: reel.handle,
      views: reel.views,
      likes: reel.likes,
      shares: reel.shares,
      poster: reel.poster,
      videoUrl: reel.videoUrl || '',
      productName: reel.product.name,
      productImage: reel.product.image,
      productPrice: reel.product.price,
      productMrp: reel.product.mrp,
      productDiscount: reel.product.discount,
      productHref: reel.product.href,
      sortOrder: reel.sortOrder,
      isActive: reel.isActive,
    });
    setMsg(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const payload = {
      title: form.title,
      handle: form.handle,
      views: form.views,
      likes: Number(form.likes) || 0,
      shares: Number(form.shares) || 0,
      poster: form.poster,
      videoUrl: form.videoUrl || undefined,
      product: {
        name: form.productName,
        image: form.productImage,
        price: Number(form.productPrice) || 0,
        mrp: Number(form.productMrp) || 0,
        discount: form.productDiscount,
        href: form.productHref,
      },
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };

    try {
      const url = editingId ? `/api/admin/reels/${encodeURIComponent(editingId)}` : '/api/admin/reels';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMsg({
          type: 'success',
          text: editingId ? 'Reel updated successfully!' : 'New reel created successfully!',
        });
        setNonce((n) => n + 1);
        setTimeout(() => {
          closeModal();
          setMsg(null);
        }, 1200);
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg({
          type: 'error',
          text: err.error?.message || 'Failed to save reel. Please check all fields.',
        });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(reel: BrandReel) {
    await fetch(`/api/admin/reels/${encodeURIComponent(reel.id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isActive: !reel.isActive }),
    });
    setNonce((n) => n + 1);
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    await fetch(`/api/admin/reels/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    setNonce((n) => n + 1);
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Brand Reels Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage shoppable Instagram-style reels and tagged products shown on the homepage.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 transition"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add New Reel
        </button>
      </div>

      {/* Main Table / Grid */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Loading reels…
        </div>
      ) : !data || data.reels.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-gray-900">No brand reels found</p>
          <p className="text-xs text-gray-500 mt-1">Add your first reel to showcase on the homepage.</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-gray-800"
          >
            Create Reel
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Video / Reel</th>
                <th className="px-4 py-3">Tagged Product</th>
                <th className="px-4 py-3">Metrics</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.reels.map((reel) => (
                <tr key={reel.id} className="hover:bg-gray-50/80 transition">
                  <td className="px-4 py-3 font-mono font-medium text-gray-500">
                    #{reel.sortOrder}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-gray-900 border border-gray-200">
                        <Image
                          src={reel.poster}
                          alt={reel.title}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      </div>
                      <div className="max-w-xs">
                        <p className="font-semibold text-gray-900 line-clamp-1">{reel.title}</p>
                        <p className="text-[11px] text-gray-500">{reel.handle}</p>
                        {(() => {
                          const badge = getVideoSourceBadge(reel.videoUrl);
                          return (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${badge.badgeClass}`}
                              >
                                <span>{badge.icon}</span>
                                <span>{badge.label}</span>
                              </span>
                              {reel.videoUrl && (
                                <a
                                  href={reel.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-gray-400 hover:text-gray-700 underline"
                                >
                                  View link ↗
                                </a>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-gray-100 border border-gray-200">
                        <Image
                          src={reel.product.image}
                          alt={reel.product.name}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1">{reel.product.name}</p>
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="font-bold text-gray-900">₹{reel.product.price}</span>
                          <span className="text-gray-400 line-through">₹{reel.product.mrp}</span>
                          <span className="font-semibold text-emerald-600">{reel.product.discount}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="space-y-0.5 text-[11px]">
                      <p>👁 {reel.views} views</p>
                      <p>❤️ {reel.likes} likes • ↗ {reel.shares} shares</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(reel)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                        reel.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${reel.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {reel.isActive ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(reel)}
                        className="rounded px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(reel.id, reel.title)}
                        className="rounded px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============ CREATE / EDIT MODAL ============ */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editingId ? 'Edit Brand Reel' : 'Add New Brand Reel'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {msg && (
              <div
                className={`mt-4 rounded-lg p-3 text-xs font-medium ${
                  msg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {msg.text}
              </div>
            )}

            <form onSubmit={handleSave} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reel Info */}
                <div className="space-y-3 sm:col-span-2">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-1">Reel Video &amp; Title</h4>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Reel Hook / Title *</label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Snap. Charge. Go. The ultimate MagSafe carry ⚡"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Creator / Tag Handle</label>
                      <input
                        type="text"
                        value={form.handle}
                        onChange={(e) => setForm({ ...form, handle: e.target.value })}
                        placeholder="e.g. @evmzone • Daily Carry"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Display Views</label>
                      <input
                        type="text"
                        value={form.views}
                        onChange={(e) => setForm({ ...form, views: e.target.value })}
                        placeholder="e.g. 38.4K"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Poster Image URL *</label>
                      <input
                        type="text"
                        required
                        value={form.poster}
                        onChange={(e) => setForm({ ...form, poster: e.target.value })}
                        placeholder="e.g. /cat-powerbank.jpg or CDN link"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-medium text-gray-700">Video URL</label>
                        <span className="text-[10px] text-gray-500">Instagram, YouTube, or MP4</span>
                      </div>
                      <input
                        type="text"
                        value={form.videoUrl}
                        onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                        placeholder="e.g. https://www.instagram.com/reel/... or https://youtu.be/... or .mp4"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                      />
                      {form.videoUrl && (() => {
                        const badge = getVideoSourceBadge(form.videoUrl);
                        return (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${badge.badgeClass}`}
                            >
                              <span>{badge.icon}</span>
                              <span>{badge.label} detected</span>
                            </span>
                            <span className="text-[10px] text-gray-500">{badge.hint}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Tagged Product Info */}
                <div className="space-y-3 sm:col-span-2 pt-2">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-1">Shoppable Product Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Product Title *</label>
                      <input
                        type="text"
                        required
                        value={form.productName}
                        onChange={(e) => setForm({ ...form, productName: e.target.value })}
                        placeholder="e.g. Encase 10,000mAh MagSafe Power Bank"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Product Image URL *</label>
                      <input
                        type="text"
                        required
                        value={form.productImage}
                        onChange={(e) => setForm({ ...form, productImage: e.target.value })}
                        placeholder="e.g. /cat-powerbank.jpg"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Selling Price (₹) *</label>
                      <input
                        type="number"
                        required
                        value={form.productPrice}
                        onChange={(e) => setForm({ ...form, productPrice: Number(e.target.value) })}
                        placeholder="1499"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">MRP Price (₹) *</label>
                      <input
                        type="number"
                        required
                        value={form.productMrp}
                        onChange={(e) => setForm({ ...form, productMrp: Number(e.target.value) })}
                        placeholder="2999"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Discount Tag</label>
                      <input
                        type="text"
                        value={form.productDiscount}
                        onChange={(e) => setForm({ ...form, productDiscount: e.target.value })}
                        placeholder="50% OFF"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Product Link (Href)</label>
                    <input
                      type="text"
                      value={form.productHref}
                      onChange={(e) => setForm({ ...form, productHref: e.target.value })}
                      placeholder="/products or /products/encase-powerbank"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                    />
                  </div>
                </div>

                {/* Display & Order */}
                <div className="space-y-3 sm:col-span-2 pt-2">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-1">Display Settings</h4>
                  <div className="flex items-center gap-6">
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Sort Order</label>
                      <input
                        type="number"
                        value={form.sortOrder}
                        onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                        placeholder="0"
                        className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="form-is-active"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <label htmlFor="form-is-active" className="font-medium text-gray-800">
                        Active on Homepage
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-gray-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving…' : editingId ? 'Update Reel' : 'Create Reel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
