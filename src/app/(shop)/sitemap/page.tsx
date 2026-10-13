import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { absoluteUrl } from '@/lib/config/site';
import { organizationJsonLd, breadcrumbJsonLd } from '@/lib/seo/structured-data';
import { safeListProducts, safeListCategories } from '@/services/catalog/catalog.read';
import { formatInr } from '@/lib/format';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Site Map | EVM India — High-Performance Electronics & Audio',
  description:
    'Comprehensive directory of all power banks, wireless headphones, earphones, categories, brand stories, and customer support resources on the official EVM D2C store.',
  alternates: { canonical: absoluteUrl('/sitemap') },
  openGraph: {
    title: 'Site Map — EVM India',
    description:
      'Explore all products, power banks, audio gear, and customer support pages on the official EVM D2C store.',
    url: absoluteUrl('/sitemap'),
    type: 'website',
  },
};

const ACCENT = 'text-[#b3a291]';

const STORE_PAGES = [
  {
    title: 'Home',
    href: '/',
    desc: 'Official storefront homepage featuring latest releases, lifestyle moments, and press features.',
    kicker: 'MAIN',
  },
  {
    title: 'All Products Catalog',
    href: '/products',
    desc: 'Complete inventory of EVM power banks, wireless headphones, and wired earphones.',
    kicker: 'SHOP',
  },
  {
    title: 'About EVM',
    href: '/about',
    desc: 'Our journey, 3 Crore+ satisfied customers, nationwide coverage across 625+ cities.',
    kicker: 'BRAND',
  },
  {
    title: 'Shopping Bag / Cart',
    href: '/cart',
    desc: 'Review selected items, apply promotional discount coupons, and proceed to checkout.',
    kicker: 'CHECKOUT',
  },
  {
    title: 'Customer Login',
    href: '/login',
    desc: 'Quick passwordless phone OTP and email authentication for order history and fast checkout.',
    kicker: 'ACCOUNT',
  },
  {
    title: 'Brand Reels Showcase',
    href: '/#brand-reels',
    desc: 'Shoppable Instagram-style short videos highlighting EVM gear in daily action.',
    kicker: 'MEDIA',
  },
];

const SUPPORT_POLICIES = [
  {
    title: 'Free Doorstep Pick-up & Drop Service',
    href: 'https://evmzone.com/evm-pickup-and-drop',
    desc: 'Door-to-door hassle-free warranty repair and pickup network across India.',
    isExternal: true,
  },
  {
    title: 'Warranty Support & Registration',
    href: 'https://evmzone.com/evm-pickup-and-drop',
    desc: 'Official 1 to 2-year manufacturer warranty verification and claims portal.',
    isExternal: true,
  },
  {
    title: 'Nationwide Shipping & Delivery Policy',
    href: '/about#shipping',
    desc: 'Fast 4 to 15-day dispatched delivery across 625+ pin codes with live tracking.',
  },
  {
    title: 'Terms of Use & Purchase Agreement',
    href: '/products',
    desc: 'Standard commercial conditions, acceptable usage policies, and consumer safeguards.',
  },
  {
    title: 'Privacy & Data Protection Policy',
    href: '/products',
    desc: 'Strict personal data privacy commitments, cookie consent, and encryption standards.',
  },
  {
    title: 'Customer Support Helpdesk',
    href: 'mailto:support@evmzone.com',
    desc: 'Direct email support: support@evmzone.com • Toll-free helpline: 1800 102 0432.',
    isExternal: true,
  },
];

const DEFAULT_CATEGORIES = [
  {
    slug: 'power-banks',
    name: 'Power Banks & MagSafe',
    description: 'Snap-and-charge magnetic wireless battery packs, 10,000mAh to 20,000mAh high-density power banks.',
  },
  {
    slug: 'headphones',
    name: 'Wireless Headphones',
    description: 'Over-ear hybrid active noise-cancelling headphones with ultra-low latency and 40h+ playback.',
  },
  {
    slug: 'earphones',
    name: 'Wired & Type-C Earphones',
    description: 'Deep-bass high-definition stereo in-ear monitors with inline microphones and braided cables.',
  },
];

export default async function SitemapPage() {
  const [categories, productResult] = await Promise.all([
    safeListCategories(),
    safeListProducts({ limit: 100, sort: 'newest' }),
  ]);

  const activeCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const products = productResult.items;

  const jsonLd = [
    organizationJsonLd(),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Site Map', path: '/sitemap' },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'EVM Store Site Map',
      description: 'Directory of all pages, categories, and products on EVM India.',
      url: absoluteUrl('/sitemap'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#fbf9f6] text-neutral-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero / Header */}
      <div className="border-b border-neutral-200/80 bg-white">
        <Container className="py-12 sm:py-16">
          <Breadcrumbs
            items={[
              { name: 'Home', path: '/' },
              { name: 'Site Map', path: '/sitemap' },
            ]}
          />

          <div className="mt-6 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${ACCENT}`}>
                Directory &amp; Navigation
              </span>
              <h1 className="mt-2 font-serif text-3xl font-normal tracking-tight text-neutral-900 sm:text-5xl">
                EVM Site Map
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
                Discover the complete index of EVM products, categories, brand milestones, and customer support resources. Optimized for search engines and streamlined human browsing.
              </p>
            </div>

            {/* Crawl Feeds */}
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-700 transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                XML Feed (/sitemap.xml)
              </a>
              <a
                href="/feeds/google-merchant.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-700 transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Google Merchant Feed (/feeds/google-merchant.xml)
              </a>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-700 transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <circle cx="12" cy="5" r="2" />
                  <path d="M12 7v4" />
                </svg>
                Robots (/robots.txt)
              </a>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-12 sm:py-16">
        <div className="space-y-16">
          {/* Section 1: Main Storefront Pages */}
          <section aria-labelledby="section-main">
            <div className="flex items-center gap-3 border-b border-neutral-200 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                01
              </span>
              <h2 id="section-main" className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl">
                Storefront &amp; Core Experience
              </h2>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STORE_PAGES.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="group relative flex flex-col justify-between rounded-xl border border-neutral-200/90 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-neutral-900 hover:shadow-md"
                >
                  <div>
                    <span className="text-[10px] font-bold tracking-widest text-neutral-400 group-hover:text-neutral-900 transition">
                      {page.kicker}
                    </span>
                    <h3 className="mt-1 text-base font-semibold text-neutral-900 group-hover:underline">
                      {page.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                      {page.desc}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-medium text-neutral-900">
                    <span>Visit Page</span>
                    <svg className="h-3.5 w-3.5 transition group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Section 2: Product Categories & Filters */}
          <section aria-labelledby="section-categories">
            <div className="flex items-center gap-3 border-b border-neutral-200 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                02
              </span>
              <h2 id="section-categories" className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl">
                Product Categories &amp; Collections
              </h2>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {activeCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/products?category=${encodeURIComponent(cat.slug)}`}
                  className="group rounded-xl border border-neutral-200/90 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-neutral-900 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">
                      CATEGORY
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">
                      /products?category={cat.slug}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-neutral-900 group-hover:underline">
                    {cat.name}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                    {cat.description || `Browse all top-rated ${cat.name} by EVM.`}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-medium text-neutral-900">
                    <span>Explore Collection</span>
                    <svg className="h-3.5 w-3.5 transition group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Section 3: Live Active Products Directory */}
          <section aria-labelledby="section-products">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                  03
                </span>
                <h2 id="section-products" className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl">
                  Active Products Directory ({products.length})
                </h2>
              </div>
              <Link href="/products" className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 underline">
                View Full Catalog →
              </Link>
            </div>

            {products.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-xs text-neutral-500">
                Products are dynamically retrieved from the live database. Visit the{' '}
                <Link href="/products" className="font-semibold text-neutral-900 underline">
                  Catalog page
                </Link>{' '}
                to browse the lineup.
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((prod) => (
                  <Link
                    key={prod.id}
                    href={`/products/${prod.slug}`}
                    className="group flex flex-col justify-between rounded-xl border border-neutral-200/90 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-neutral-900 hover:shadow-md"
                  >
                    <div>
                      {/* Product Thumbnail */}
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-100">
                        {prod.thumbnail?.url ? (
                          <Image
                            src={prod.thumbnail.url}
                            alt={prod.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                            EVM Gear
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                          {prod.brand || 'EVM'}
                        </span>
                        <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2 group-hover:underline">
                          {prod.title}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                      <span className="text-xs font-bold text-neutral-900">
                        {formatInr(prod.price) || 'MRP Available'}
                      </span>
                      <span className="text-[11px] font-medium text-neutral-500 group-hover:text-neutral-900">
                        View Product →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Section 4: Customer Care & Policies */}
          <section aria-labelledby="section-support">
            <div className="flex items-center gap-3 border-b border-neutral-200 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                04
              </span>
              <h2 id="section-support" className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl">
                Customer Care, Warranty &amp; Store Policies
              </h2>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SUPPORT_POLICIES.map((item) => {
                const content = (
                  <div className="flex h-full flex-col justify-between rounded-xl border border-neutral-200/90 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-neutral-900 hover:shadow-md">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">
                          POLICY &amp; SERVICE
                        </span>
                        {item.isExternal && (
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-500">
                            EXTERNAL
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-neutral-900 group-hover:underline">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                        {item.desc}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-neutral-900">
                      <span>Access Details</span>
                      <svg className="h-3.5 w-3.5 transition group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </div>
                  </div>
                );

                return item.isExternal ? (
                  <a
                    key={item.title}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    {content}
                  </a>
                ) : (
                  <Link key={item.title} href={item.href} className="group">
                    {content}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Section 5: Brand Credibility & Direct Contact */}
          <section className="rounded-2xl border border-neutral-200 bg-neutral-950 p-8 text-white sm:p-12">
            <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
              <div className="max-w-xl">
                <span className={`text-xs font-bold uppercase tracking-widest ${ACCENT}`}>
                  DIRECT CONTACT &amp; ASSISTANCE
                </span>
                <h3 className="mt-2 font-serif text-2xl font-light tracking-tight sm:text-3xl text-white">
                  Need Personalized Help with Your EVM Gear?
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400 sm:text-sm">
                  Our dedicated technical support and service teams are ready to help with order tracking, pin code serviceability, pickup-and-drop warranty requests, and bulk corporate gifting inquiries.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="mailto:support@evmzone.com"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-200"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  support@evmzone.com
                </a>
                <a
                  href="tel:18001020432"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  1800 102 0432 (Toll Free)
                </a>
              </div>
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
