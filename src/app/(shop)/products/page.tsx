import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { CatalogControls } from '@/components/shop/CatalogControls';
import { Pagination } from '@/components/shop/Pagination';
import { EmptyState } from '@/components/shop/EmptyState';
import { safeListProducts, safeListCategories } from '@/services/catalog/catalog.read';
import { breadcrumbJsonLd, organizationJsonLd, faqJsonLd } from '@/lib/seo/structured-data';
import { absoluteUrl } from '@/lib/config/site';
import type { ProductSort } from '@/types/catalog';

// ISR: catalog changes infrequently; revalidate periodically for fast delivery.
export const revalidate = 300;

const CATEGORY_SEO: Record<string, { title: string; description: string }> = {
  'power-banks': {
    title: 'Power Banks & MagSafe Wireless Chargers | EVM India',
    description:
      'Explore EVM snap-and-charge MagSafe wireless power banks. High-density 10,000mAh to 20,000mAh fast-charging with free doorstep pickup & drop warranty.',
  },
  headphones: {
    title: 'Wireless Over-Ear Headphones with Hybrid ANC | EVM India',
    description:
      'Immerse in studio sound with EVM wireless headphones. Ultra-low latency, 40h+ playtime, deep bass, and comfortable memory-foam cushions.',
  },
  earphones: {
    title: 'Wired & Type-C Stereo In-Ear Earphones | EVM India',
    description:
      'High-definition Type-C and 3.5mm stereo earphones with braided anti-tangle cables, crisp inline microphones, and punchy acoustic bass.',
  },
};

const CATEGORY_GUIDES: Record<
  string,
  {
    kicker: string;
    headline: string;
    paragraphs: string[];
    faqs: { question: string; answer: string }[];
  }
> = {
  'power-banks': {
    kicker: 'BUYER’S GUIDE & SPECS',
    headline: 'Choosing the Right EVM Power Bank for Your Everyday Carry',
    paragraphs: [
      'Whether you need pocket-sized MagSafe convenience or multi-day charging reserves for intercity travel, EVM power banks are built with grade-A lithium-polymer cells and precision heat management.',
      'Our Enmag series features ultra-strong N52 neodymium magnetic arrays designed for secure attachment to MagSafe-compatible smartphones, delivering steady wireless power without cable tangles.',
    ],
    faqs: [
      {
        question: 'Are EVM power banks safe to carry on commercial flights in India?',
        answer:
          'Yes, all EVM 10,000mAh and 20,000mAh power banks comply with DGCA and international aviation guidelines (rated under 100 watt-hours) for passenger cabin baggage.',
      },
      {
        question: 'How many charges will a 10,000mAh power bank provide?',
        answer:
          'A typical 10,000mAh capacity provides approximately 1.8 to 2.2 full recharges for modern smartphones like iPhone 15/16 and Samsung Galaxy S series.',
      },
      {
        question: 'Does EVM offer doorstep pickup and drop warranty for power banks?',
        answer:
          'Yes, EVM provides doorstep pickup and replacement warranty support across 625+ Indian cities. Simply raise a request on evmzone.com/evm-pickup-and-drop.',
      },
    ],
  },
  headphones: {
    kicker: 'ACOUSTIC ENGINEERING',
    headline: 'EVM Wireless Headphones: Built for Commute, Focus, and Music',
    paragraphs: [
      'Engineered with custom 40mm dynamic drivers and hybrid active noise cancellation, EVM wireless headphones deliver deep acoustic fidelity while eliminating transit hum and ambient office chatter.',
      'Enjoy over 40 hours of playtime on a single Type-C charge, with memory-foam protein leather cushions crafted for fatigue-free all-day wear.',
    ],
    faqs: [
      {
        question: 'Do EVM headphones have low latency for movies and gaming?',
        answer:
          'Yes, our latest wireless headphones feature Bluetooth 5.3 with an ultra-low latency gaming mode to keep audio in sync with video frames.',
      },
      {
        question: 'Can I use EVM wireless headphones with a 3.5mm AUX cable?',
        answer:
          'Yes, dual-mode connectivity allows seamless switching between wireless Bluetooth audio and wired 3.5mm playback when battery is low.',
      },
    ],
  },
  earphones: {
    kicker: 'PRECISION AUDIO ESSENTIALS',
    headline: 'Why EVM Type-C and 3.5mm Earphones Stand Out',
    paragraphs: [
      'Crafted for crisp vocal clarity and punchy bass, EVM earphones feature built-in Digital-to-Analog Converters (DAC) for uncompressed, zero-latency digital audio playback on modern smartphones without headphone jacks.',
      'Braided cables resist tangles and fraying, backed by reinforced strain relief joints tested for over 10,000 bend cycles.',
    ],
    faqs: [
      {
        question: 'Will Type-C earphones work with all Android and iPad devices?',
        answer:
          'Yes, EVM Type-C earphones feature broad digital OTG audio compatibility across Samsung, OnePlus, Google Pixel, Xiaomi, and Apple iPad devices.',
      },
    ],
  },
};

CATEGORY_SEO['powerbank'] = CATEGORY_SEO['power-banks']!;
CATEGORY_GUIDES['powerbank'] = CATEGORY_GUIDES['power-banks']!;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const cat = typeof sp.category === 'string' ? sp.category : undefined;
  const seo = cat ? CATEGORY_SEO[cat] : undefined;

  const title = seo?.title || 'All Products — Power Banks, Headphones & Earphones | EVM India';
  const description =
    seo?.description ||
    'Explore the complete EVM collection of magnetic power banks, ANC wireless headphones, and Type-C earphones. Fast doorstep delivery across 625+ Indian cities.';
  const canonical = cat ? absoluteUrl(`/products?category=${cat}`) : absoluteUrl('/products');

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
  };
}

const VALID_SORTS: ProductSort[] = ['newest', 'price_asc', 'price_desc'];
const ACCENT = 'text-[#b3a291]';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const category = typeof sp.category === 'string' ? sp.category : undefined;
  const sortParam = typeof sp.sort === 'string' ? sp.sort : 'newest';
  const sort: ProductSort = VALID_SORTS.includes(sortParam as ProductSort)
    ? (sortParam as ProductSort)
    : 'newest';
  const cursor = typeof sp.cursor === 'string' ? sp.cursor : undefined;

  const [{ items, nextCursor }, categories] = await Promise.all([
    safeListProducts({ category, sort, limit: 24, cursor }),
    safeListCategories(),
  ]);

  const guide = category ? CATEGORY_GUIDES[category] : undefined;
  const faqSchema = guide ? faqJsonLd(guide.faqs) : null;

  const jsonLd = [
    organizationJsonLd(),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      {
        name: category
          ? CATEGORY_SEO[category]?.title.split('|')[0]?.trim() || 'Category'
          : 'Products',
        path: category ? `/products?category=${category}` : '/products',
      },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: category ? CATEGORY_SEO[category]?.title || 'EVM Products' : 'EVM Products Catalog',
      description: 'Official EVM high-performance consumer tech and audio accessories catalog.',
      url: category ? absoluteUrl(`/products?category=${category}`) : absoluteUrl('/products'),
    },
    faqSchema,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#f4f1ec] text-neutral-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Collection Header */}
      <section className="relative overflow-hidden bg-neutral-950 text-white pt-8 pb-12 sm:pt-10 sm:pb-14">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_40%,rgba(255,255,255,0.06),transparent_60%)]" />
        <div className="relative mx-auto max-w-[1600px] px-6 sm:px-10">
          <div className="max-w-3xl">
            <Breadcrumbs
              variant="dark"
              items={[
                { name: 'Home', path: '/' },
                { name: 'Products', path: '/products' },
              ]}
            />
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Our Collection
            </p>
            <h1 className="mt-2 text-4xl font-light leading-[1.08] tracking-tight sm:text-6xl text-white">
              Engineered for
              <br />
              <span className={ACCENT}>Everyday Performance.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              Explore EVM&apos;s full lineup of fast-charging magnetic power banks, studio-grade audio, and precision mobile essentials.
            </p>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10 space-y-8">
          <CatalogControls categories={categories} itemCount={items.length} />

          <div>
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <ProductGrid products={items} />
                <Pagination nextCursor={nextCursor} baseQuery={{ category, sort, cursor }} />
              </>
            )}
          </div>

          {/* SEO Category Buying Guide & FAQs Section */}
          {guide && (
            <div className="mt-16 rounded-3xl border border-neutral-300/80 bg-white p-8 sm:p-12 shadow-sm">
              <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${ACCENT}`}>
                {guide.kicker}
              </span>
              <h2 className="mt-2 font-serif text-2xl font-light tracking-tight text-neutral-900 sm:text-3xl">
                {guide.headline}
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-600">
                {guide.paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>

              {/* FAQs Accordion */}
              <div className="mt-8 border-t border-neutral-200 pt-8">
                <h3 className="text-base font-semibold text-neutral-900">
                  Frequently Asked Questions
                </h3>
                <div className="mt-4 divide-y divide-neutral-200">
                  {guide.faqs.map((faq, idx) => (
                    <details key={idx} className="group py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-sm text-neutral-900 hover:text-neutral-600">
                        <span>{faq.question}</span>
                        <span className="ml-4 shrink-0 transition group-open:rotate-180">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </span>
                      </summary>
                      <p className="mt-3 text-xs leading-relaxed text-neutral-600">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

