import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { organizationJsonLd, breadcrumbJsonLd } from '@/lib/seo/structured-data';
import { absoluteUrl } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'About Us — EVM',
  description: 'EVM is a Made In India consumer electronics brand focused on high-performance power banks, audio, and mobile accessories. Serving 3 Crore+ customers across 625+ cities.',
  alternates: { canonical: absoluteUrl('/about') },
  openGraph: { title: 'About Us — EVM', url: absoluteUrl('/about'), type: 'website' },
};

const ACCENT = 'text-[#b3a291]';

const STATS = [
  { value: '3 Crore+', label: 'Happy Customers' },
  { value: '625+', label: 'Cities Covered' },
  { value: '200+', label: 'Products Delivered' },
  { value: '2,600+', label: 'Service Claims Resolved' },
];

const VALUES = [
  { title: 'Authenticity', desc: 'Genuine Indian engineering & transparent quality.' },
  { title: 'Utility', desc: 'Products designed to solve real daily-life needs.' },
  { title: 'Excellence', desc: 'Uncompromising standards across design and durability.' },
  { title: 'Integrity', desc: 'Fair pricing, honest promises, and consumer trust.' },
  { title: 'Empathy', desc: 'Customer-first mindset at every touchpoint.' },
  { title: 'Simplicity', desc: 'Clean, intuitive tech without clutter or complexity.' },
  { title: 'Accountability', desc: 'Hassle-free warranty support and dedicated care.' },
  { title: 'Cooperative', desc: 'Strong distribution network empowering Indian retail.' },
  { title: 'Flexibility', desc: 'Adapting fast to modern charging & audio standards.' },
  { title: 'Spirit of Adventure', desc: 'Pioneering new tech for the mobile generation.' },
];

export default function AboutPage() {
  const jsonLd = [
    organizationJsonLd(),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'About Us', path: '/about' },
    ]),
  ];

  return (
    <div className="min-h-screen bg-[#f4f1ec] text-neutral-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ============ HERO BANNER ============ */}
      <section className="relative overflow-hidden bg-neutral-950 text-white pt-8 pb-16 sm:pt-10 sm:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_35%,rgba(255,255,255,0.06),transparent_60%)]" />
        <div className="relative mx-auto max-w-[1600px] px-6 sm:px-10">
          <div className="max-w-3xl">
            <Breadcrumbs
              variant="dark"
              items={[
                { name: 'Home', path: '/' },
                { name: 'About Us', path: '/about' },
              ]}
            />
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Made In India Consumer Electronics
            </p>
            <h1 className="mt-2 text-4xl font-light leading-[1.05] tracking-tight sm:text-6xl text-white">
              Connecting &amp; Supporting <br className="hidden sm:inline" />
              <span className={ACCENT}>Lives Across India.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
              EVM is a premier Indian technology brand dedicated to delivering reliable, sleek, and high-performance consumer gadgets built for your everyday lifestyle.
            </p>
          </div>
        </div>
      </section>

      {/* ============ STATS STRIP ============ */}
      <section className="border-y border-neutral-200/80 bg-[#efeae3] py-10">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
          <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-light tracking-tight text-neutral-900 sm:text-4xl">
                  {s.value}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BRAND STORY ============ */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                Our Journey &amp; Legacy
              </p>
              <h2 className="mt-2 text-3xl font-light leading-tight tracking-tight sm:text-5xl">
                14+ Years of Tech Innovation &amp; Trust.
              </h2>
              <p className="mt-6 text-sm leading-relaxed text-neutral-600 sm:text-base">
                Incorporated in <strong>2008</strong>, EVM started with a clear vision: to empower consumers by providing easy access to reliable, high-utility, smart-value electronics.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-neutral-600 sm:text-base">
                As a proud <strong>‘Made In India’</strong> brand, EVM has grown from a robust B2B technology provider into a modern D2C consumer brand. We leverage decades of manufacturing expertise to build fast-charging magnetic power banks, high-definition audio gear, and storage solutions that solve everyday consumer problems.
              </p>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-[#efeae3] to-[#e2dbd1] p-8 sm:p-12 border border-neutral-300/60 shadow-sm">
              <h3 className="text-xl font-medium tracking-tight text-neutral-900">
                Why EVM Exists
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-neutral-700">
                We seek to change the perception of tech purchasing by proving that Indian brands can deliver world-class design, ultra-fast charging, and military-grade durability at accessible prices.
              </p>
              <div className="mt-8 pt-6 border-t border-neutral-300/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Founded</p>
                  <p className="text-lg font-medium text-neutral-900">2008</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Origin</p>
                  <p className="text-lg font-medium text-neutral-900">Mumbai, India</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Mission</p>
                  <p className="text-lg font-medium text-neutral-900">Fair Trade &amp; Utility</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ VISION & MISSION ============ */}
      <section className="bg-[#efeae3] py-16 sm:py-24 border-t border-neutral-200/80">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              What Drives Us
            </p>
            <h2 className="mt-2 text-3xl font-light tracking-tight sm:text-5xl">
              Vision &amp; Mission
            </h2>
            <p className="mt-3 text-xs text-neutral-500">
              Your satisfaction is our greatest compliment.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Vision */}
            <div className="rounded-2xl bg-white p-8 sm:p-10 border border-neutral-200/80 shadow-sm transition hover:shadow-md">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-950 text-white">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
              </div>
              <h3 className="mt-5 text-2xl font-medium tracking-tight text-neutral-900">
                Our Vision
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-neutral-600 sm:text-base">
                To provide the utmost utilitarian and innovative products, building a brand that stands for absolute utility and solves our consumers&apos; daily lifestyle challenges seamlessly.
              </p>
            </div>

            {/* Mission */}
            <div className="rounded-2xl bg-white p-8 sm:p-10 border border-neutral-200/80 shadow-sm transition hover:shadow-md">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-950 text-white">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3v18M3 12h18" />
                </svg>
              </div>
              <h3 className="mt-5 text-2xl font-medium tracking-tight text-neutral-900">
                Our Mission
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-neutral-600 sm:text-base">
                EVM is focused on fair trade and total satisfaction for Indian consumers. By combining affordable pricing, premium build quality, and progressive technology, we deliver ultimate product experiences.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CORE VALUES ============ */}
      <section className="bg-neutral-950 text-white py-20 sm:py-28">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Guiding Principles
            </p>
            <h2 className="mt-2 text-3xl font-light tracking-tight sm:text-5xl text-white">
              Our Core <span className={ACCENT}>Values</span>
            </h2>
            <p className="mt-4 text-sm text-white/70">
              The fundamental principles behind every product we design and every service we deliver.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/10"
              >
                <h3 className="text-base font-semibold text-white">{v.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/60">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MANUFACTURING & DELIVERY PROMISE ============ */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-8 sm:p-10 border border-neutral-200/80">
              <h3 className="text-xl font-medium tracking-tight text-neutral-900">
                Manufacturing &amp; Quality
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                EVM operates with strict quality control across IT hardware, mobile power accessories, and audio gear. Every unit undergoes rigorous stress testing to guarantee long-term safety and performance.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-8 sm:p-10 border border-neutral-200/80">
              <h3 className="text-xl font-medium tracking-tight text-neutral-900">
                Nationwide Delivery Promise
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                Standard delivery ranges from <strong>4 to 15 days</strong> across 625+ Indian cities with full dispatch tracking. Our dedicated support team is available 24/7 to assist you.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold text-neutral-900">
                <a href="mailto:support@evmzone.com" className="underline hover:text-neutral-600">
                  support@evmzone.com
                </a>
                <span>•</span>
                <a href="tel:+18001020432" className="underline hover:text-neutral-600">
                  Toll Free: 1800 102 0432
                </a>
              </div>
            </div>
          </div>

          {/* CTA Banner */}
          <div className="mt-16 rounded-3xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-10 sm:p-14 text-center text-white">
            <h3 className="text-3xl font-light tracking-tight sm:text-4xl">
              Ready to Upgrade Your Everyday Tech?
            </h3>
            <p className="mt-3 text-sm text-white/70 max-w-xl mx-auto">
              Explore our lineup of magnetic power banks, headphones, and earphones.
            </p>
            <Link
              href="/products"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-neutral-900 transition hover:bg-neutral-100"
            >
              Explore Collection →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
