'use client';

import { useState } from 'react';

export function ContactForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    orderRef: '',
    subject: 'Order Inquiry',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulating quick client-side submission with friendly feedback
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  }

  if (submitted) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-2xl">
          ✓
        </div>
        <h3 className="font-bold text-sm text-emerald-950">Thank you for reaching out!</h3>
        <p className="text-xs text-emerald-800 leading-relaxed">
          Your message has been received. Our support team will respond to <strong>{form.email}</strong> within 24 business hours.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setForm({ name: '', email: '', phone: '', orderRef: '', subject: 'Order Inquiry', message: '' });
          }}
          className="mt-2 text-xs font-semibold text-emerald-900 underline hover:text-emerald-950"
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div>
        <label htmlFor="contact-name" className="block font-medium text-neutral-800 mb-1">
          Full Name *
        </label>
        <input
          id="contact-name"
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Rahul Sharma"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 transition"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="contact-email" className="block font-medium text-neutral-800 mb-1">
            Email Address *
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 transition"
          />
        </div>
        <div>
          <label htmlFor="contact-phone" className="block font-medium text-neutral-800 mb-1">
            Mobile Number *
          </label>
          <input
            id="contact-phone"
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="10-digit mobile"
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 transition"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="contact-subject" className="block font-medium text-neutral-800 mb-1">
            Inquiry Subject
          </label>
          <select
            id="contact-subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 transition"
          >
            <option value="Order Inquiry">Order Inquiry &amp; Dispatch</option>
            <option value="Product Details">Product Specifications</option>
            <option value="Warranty / Replacement">Warranty &amp; Replacement</option>
            <option value="Payment / Refund">Payment &amp; Refund Status</option>
            <option value="Corporate / Bulk">Corporate &amp; Bulk Gifting</option>
            <option value="Other">General Inquiry</option>
          </select>
        </div>
        <div>
          <label htmlFor="contact-orderRef" className="block font-medium text-neutral-800 mb-1">
            Order Reference ID (Optional)
          </label>
          <input
            id="contact-orderRef"
            type="text"
            value={form.orderRef}
            onChange={(e) => setForm({ ...form, orderRef: e.target.value })}
            placeholder="e.g. EVM-ORD-12345"
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 transition font-mono"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="block font-medium text-neutral-800 mb-1">
          Your Message *
        </label>
        <textarea
          id="contact-message"
          required
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Please describe your query in detail..."
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 transition"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-neutral-950 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Send Message'}
      </button>
    </form>
  );
}
