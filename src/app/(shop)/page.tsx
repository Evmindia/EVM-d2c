import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { organizationJsonLd } from '@/lib/seo/structured-data';
import { absoluteUrl } from '@/lib/config/site';
import { TalkOfTheTown } from '@/components/shop/TalkOfTheTown';
import { BrandReels } from '@/components/shop/BrandReels';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { safeListProducts } from '@/services/catalog/catalog.read';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'EVM India — High-Performance Power Banks, Wireless Headphones & Audio Essentials',
  description:
    'Official EVM Store: Shop MagSafe power banks, ANC wireless headphones, Type-C earphones & fast chargers. 2-year warranty & free doorstep pickup-drop across 625+ Indian cities.',
  alternates: { canonical: absoluteUrl('/') },
  openGraph: {
    title: 'EVM India — Power Banks, Wireless Headphones & Audio Essentials',
    description:
      'Official EVM Store: Shop MagSafe power banks, ANC wireless headphones, Type-C earphones & fast chargers. Free doorstep pickup & drop warranty across 625+ Indian cities.',
    url: absoluteUrl('/'),
    type: 'website',
  },
};

const ACCENT = 'text-[#b3a291]';

const CATEGORIES = [
  {
    label: 'Powerbank',
    title: 'Charge\nWithout Limits.',
    href: '/products?category=powerbank',
    image: '/cat-powerbank.jpg',
    alt: 'EVM MagSafe Magnetic Wireless Fast Charging Power Bank',
  },
  {
    label: 'Headphone',
    title: 'Sound That\nMoves You.',
    href: '/products?category=headphones',
    image: '/cat-headphone.jpg',
    alt: 'EVM Hybrid Active Noise Cancelling Wireless Headphones',
  },
  {
    label: 'Earphone',
    title: 'Tiny Size.\nBig Impact.',
    href: '/products?category=earphones',
    image: '/cat-earphone.jpg',
    alt: 'EVM HD Bass In-Ear Type-C Stereo Earphones',
  },
];

const MOMENTS = [
  { title: 'Commute', desc: 'Block out. Tune in.', icon: IconTrain, image: '/moment-commute.jpg' },
  { title: 'Work', desc: 'Stay charged. Stay focused.', icon: IconLaptop, image: '/moment-work.jpg' },
  { title: 'Everyday', desc: 'Small, sleek, always with you.', icon: IconBag, image: '/moment-everyday.jpg' },
];

const FEATURES = [
  { title: 'Fast & Efficient', sub: 'Power up quickly.', icon: IconBolt },
  { title: 'Magnetic Design', sub: 'Snap. Charge. Go.', icon: IconMagnet },
  { title: 'Lightweight', sub: 'Carry less. Do more.', icon: IconFeather },
  { title: 'Premium Quality', sub: 'Built to last.', icon: IconShield },
];

export default async function HomePage() {
  const { items: featuredProducts } = await safeListProducts({ limit: 4, sort: 'newest' });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />

      {/* ============ HERO ============ */}
      <section className="relative min-h-[100svh] w-full overflow-hidden bg-neutral-950 text-white">
        {/* Mobile Background */}
        <Image
          src="/hero-mobile-v2.webp"
          alt="EVM Wireless Audio and Fast Charging Essentials"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_15%] sm:hidden"
        />
        {/* Desktop Background */}
        <Image
          src="/hero-headphones.webp"
          alt="EVM Wireless Over-Ear Active Noise Cancelling Headphones and Audio Accessories"
          fill
          priority
          sizes="100vw"
          className="hidden object-cover object-[75%_center] sm:block"
        />

        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/20 sm:bg-gradient-to-r sm:from-black/85 sm:via-black/50 sm:to-black/10" />
        <div className="absolute inset-0 hidden sm:block sm:bg-[radial-gradient(ellipse_at_72%_35%,rgba(255,255,255,0.08),transparent_58%)]" />

        <div className="relative mx-auto flex min-h-[100svh] max-w-[1600px] flex-col justify-end pb-14 px-6 pt-24 sm:justify-center sm:pb-16 sm:px-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-light leading-[1.05] tracking-tight sm:text-7xl">
              Tech.
              <br />
              Simplified.
              <br />
              <span className={ACCENT}>Essentials.</span>
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-white/80 sm:mt-7 sm:text-base">
              Power. Sound. Freedom.
              <br />
              Three essentials for your everyday.
            </p>
            <Link
              href="/products"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-neutral-900 transition hover:bg-white/90 sm:mt-9"
            >
              Explore Collection <IconArrow className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Carousel index marker */}
        <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-3 text-[11px] tracking-widest text-white/50 lg:flex">
          <span className="text-white">01</span>
          <span className="h-24 w-px bg-white/20" />
          <span>03</span>
        </div>
      </section>

      {/* ============ EVERYTHING YOU NEED ============ */}
      <section className="bg-[#f4f1ec] py-20 text-neutral-900 sm:py-24">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Only Three.
            </p>
            <h2 className="mt-3 text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl">
              Everything
              <br />
              <span className={ACCENT}>You Need.</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="group flex flex-col rounded-2xl bg-gradient-to-br from-[#efeae3] to-[#e2dbd1] p-7 transition hover:shadow-lg"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  {cat.label}
                </p>
                <h3 className="mt-2 whitespace-pre-line text-2xl font-medium leading-tight text-neutral-900">
                  {cat.title}
                </h3>
                <span className="mt-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-800 transition group-hover:translate-x-1">
                  <IconArrow className="h-5 w-5" />
                </span>
                {/* Product image */}
                <div className="relative mt-6 aspect-square w-full overflow-hidden rounded-xl bg-neutral-200">
                  <Image
                    src={cat.image}
                    alt={cat.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURED ESSENTIALS ============ */}
      {featuredProducts.length > 0 && (
        <section className="bg-white py-20 text-neutral-900 sm:py-24 border-t border-[#e2dbd1]/60">
          <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  Featured Drops
                </p>
                <h2 className="mt-3 text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl">
                  Trending
                  <br />
                  <span className={ACCENT}>Essentials.</span>
                </h2>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-900 transition hover:text-neutral-600"
              >
                View Full Collection <IconArrow className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-12">
              <ProductGrid products={featuredProducts} />
            </div>
          </div>
        </section>
      )}

      {/* ============ FOR EVERY MOMENT ============ */}
      <section className="bg-neutral-950 py-20 text-white sm:py-24">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.9fr] lg:items-center">
            <div>
              <h2 className="text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl">
                For Every
                <br />
                Moment.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
                From your commute to your creativity, we&apos;ve got you.
              </p>
              <Link
                href="/products"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-900 transition hover:bg-white/90"
              >
                Discover More <IconArrow className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {MOMENTS.map((m) => (
                <div
                  key={m.title}
                  className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-900"
                >
                  <Image
                    src={m.image}
                    alt={`EVM for ${m.title}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 z-10">
                    <m.icon className="h-5 w-5 text-white/90" />
                    <p className="mt-2 text-sm font-semibold text-white">{m.title}</p>
                    <p className="text-xs text-white/70">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURE STRIP ============ */}
      <section className="border-y border-[#d5ccbf] bg-[#e2dbd1] py-10">
        <div className="mx-auto grid max-w-[1600px] gap-8 px-6 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-center gap-3.5">
              <f.icon className="h-6 w-6 shrink-0 text-neutral-800" />
              <div>
                <p className="text-sm font-semibold text-neutral-950">{f.title}</p>
                <p className="text-xs text-neutral-600">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ BRAND REELS / COMMUNITY SHOWCASE ============ */}
      <BrandReels />

      {/* ============ TALK OF THE TOWN / PRESS MENTIONS ============ */}
      <TalkOfTheTown />
    </>
  );
}

/* ------------------------------- Icons ---------------------------------- */
function IconArrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}
function IconMagnet({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3v8a6 6 0 0 0 12 0V3" />
      <path d="M6 8h4M14 8h4" />
    </svg>
  );
}
function IconFeather({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 4a7 7 0 0 0-9.9 0L4 10v10h10l6.1-6.1A7 7 0 0 0 20 4Z" />
      <path d="M16 8 5 19M14 12H8" />
    </svg>
  );
}
function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
    </svg>
  );
}
function IconTrain({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M5 11h14M9 21l-2-2M15 21l2-2" />
      <circle cx="8.5" cy="14" r="0.6" fill="currentColor" />
      <circle cx="15.5" cy="14" r="0.6" fill="currentColor" />
    </svg>
  );
}
function IconLaptop({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M2 20h20" />
    </svg>
  );
}
function IconBag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 7h12l-1 13H7L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}
