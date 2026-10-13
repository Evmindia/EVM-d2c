'use client';

import { useState } from 'react';
import type { ProductFaq } from '@/types/catalog';

export function FaqAccordion({ faqs }: { faqs?: ProductFaq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading" className="border-t border-gray-100 pt-10">
      <div className="max-w-3xl">
        <h2 id="faq-heading" className="text-xl font-bold text-gray-900 sm:text-2xl">
          Frequently Asked Questions
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Everything you need to know about performance, charging, and compatibility.
        </p>

        <div className="mt-6 divide-y divide-gray-200 border-t border-b border-gray-200">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between text-left text-sm font-semibold text-gray-900 transition hover:text-gray-600"
                >
                  <span className="pr-4">{faq.question}</span>
                  <span className="text-lg font-light text-gray-400">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-2.5 pr-8 text-xs leading-relaxed text-gray-600">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
