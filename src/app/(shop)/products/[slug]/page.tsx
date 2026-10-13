import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { PriceBlock } from '@/components/shop/PriceBlock';
import { RatingSummary } from '@/components/shop/RatingSummary';
import { AvailabilityBadge } from '@/components/shop/AvailabilityBadge';
import { PdpPurchase } from '@/components/shop/PdpPurchase';
import { PincodeCheck } from '@/components/shop/PincodeCheck';
import { StorytellingSection } from '@/components/shop/StorytellingSection';
import { FeatureHighlights } from '@/components/shop/FeatureHighlights';
import { ProductSpecs } from '@/components/shop/ProductSpecs';
import { CompatibilitySection } from '@/components/shop/CompatibilitySection';
import { FaqAccordion } from '@/components/shop/FaqAccordion';
import { TrustAndService } from '@/components/shop/TrustAndService';
import { PlaceholderSection } from '@/components/shop/PlaceholderSection';
import { RelatedProducts } from '@/components/shop/RelatedProducts';
import { safeGetProduct, safeListProducts } from '@/services/catalog/catalog.read';
import { absoluteUrl } from '@/lib/config/site';
import {
  productJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  faqJsonLd,
} from '@/lib/seo/structured-data';

// ISR — PDP is the priority landing page for Instagram/Meta ads.
export const revalidate = 300;

type Params = { slug: string };

const ACCENT = 'text-[#b3a291]';

/** Dynamic SEO metadata from REAL product fields only. */
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await safeGetProduct(slug);
  if (!product) {
    return { title: 'Product not found', robots: { index: false, follow: false } };
  }
  const canonical = absoluteUrl(`/products/${product.slug}`);
  const description = product.seo?.description || product.shortDescription || undefined;
  const image = product.thumbnail?.url ?? product.images[0]?.url;
  const pageTitle = product.seo?.title || `${product.title} | EVM India`;

  return {
    title: pageTitle,
    description,
    alternates: { canonical },
    openGraph: {
      title: pageTitle,
      description,
      url: canonical,
      type: 'website',
      siteName: 'EVM India',
      locale: 'en_IN',
      ...(image ? { images: [{ url: image, width: 800, height: 800, alt: product.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      creator: '@evmzone',
      site: '@evmzone',
      ...(image ? { images: [image] } : {}),
    },
    ...(product.seo?.keywords?.length ? { keywords: product.seo.keywords } : {}),
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await safeGetProduct(slug);
  if (!product) notFound();

  // Related: same category, excluding this product. Empty if none.
  const related = (
    await safeListProducts({ category: undefined, sort: 'newest', limit: 8 })
  ).items
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, 4);

  const breadcrumb = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: product.title, path: `/products/${product.slug}` },
  ];

  const faqSchema = product.faqs && product.faqs.length > 0 ? faqJsonLd(product.faqs) : null;
  const jsonLd = [
    organizationJsonLd(),
    breadcrumbJsonLd(breadcrumb),
    productJsonLd(product),
    faqSchema,
  ].filter(Boolean);
  const available = product.stockStatus !== 'out_of_stock';

  return (
    <div className="min-h-screen bg-[#f4f1ec] text-neutral-900 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top Header Breadcrumb Bar */}
      <section className="bg-neutral-950 text-white pt-5 pb-5 sm:pt-6 sm:pb-6">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
          <Breadcrumbs variant="dark" items={breadcrumb} />
        </div>
      </section>

      {/* Main Content Area */}
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 space-y-10 sm:space-y-12 min-w-0">
        {/* Main Hero Card: Gallery + Buy Box */}
        <div className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-8 lg:p-10 border border-neutral-200/80 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start min-w-0">
          {/* Media Gallery */}
          <div className="w-full max-w-full min-w-0">
            <ProductGallery images={product.images} title={product.title} />
          </div>

          {/* Buy Box */}
          <div className="w-full max-w-full min-w-0 space-y-5 lg:sticky lg:top-24 self-start">
            <div>
              {product.brand && (
                <span className={`text-xs font-semibold uppercase tracking-widest ${ACCENT}`}>
                  {product.brand}
                </span>
              )}
              <h1 className="mt-1 text-2xl font-light leading-snug tracking-tight text-neutral-900 sm:text-4xl">
                {product.title}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <RatingSummary rating={product.rating} />
              <AvailabilityBadge status={product.stockStatus} />
            </div>

            <div className="pt-2 border-t border-neutral-100">
              <PriceBlock price={product.price} mrp={product.mrp} size="lg" />
            </div>

            {product.shortDescription && (
              <p className="text-xs leading-relaxed text-neutral-600 sm:text-sm pt-1">
                {product.shortDescription}
              </p>
            )}

            <div className="pt-2 space-y-4">
              <PdpPurchase
                productId={product.id}
                available={available}
                variants={product.variants}
                currentSlug={product.slug}
              />
              <PincodeCheck />
            </div>
          </div>
        </div>

        {/* Rich D2C Content Sections */}
        <div className="space-y-12">
          {/* 1. Visual Storytelling Narratives */}
          {product.storySections && product.storySections.length > 0 && (
            <StorytellingSection sections={product.storySections} />
          )}

          {/* 2. Key Feature Highlights */}
          <FeatureHighlights
            featureBlocks={product.featureBlocks}
            features={product.features}
          />

          {/* 3. Product Overview / Long Description */}
          {product.description && (
            <section aria-labelledby="desc-heading" className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-10 shadow-sm">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  Overview
                </p>
                <h2 id="desc-heading" className="mt-1 text-2xl font-light tracking-tight text-neutral-900 sm:text-3xl">
                  About the Product
                </h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-600">
                  {product.description}
                </p>
              </div>
            </section>
          )}

          {/* 4. Technical Specifications & What's In The Box */}
          <ProductSpecs
            specifications={product.specifications}
            whatsInTheBox={product.whatsInTheBox}
            warranty={product.warranty}
          />

          {/* 5. Device Compatibility */}
          {product.compatibility && product.compatibility.length > 0 && (
            <CompatibilitySection compatibility={product.compatibility} />
          )}

          {/* 6. EVM Trust & Guarantees */}
          <TrustAndService />

          {/* 7. Product FAQs */}
          {product.faqs && product.faqs.length > 0 ? (
            <FaqAccordion faqs={product.faqs} />
          ) : (
            <PlaceholderSection
              title="Product FAQs"
              note="Frequently asked questions for this product will appear here once available."
            />
          )}

          {/* 8. Customer Reviews */}
          <PlaceholderSection
            title="Customer Reviews"
            note="Verified purchaser ratings and feedback will be published here as real customer reviews are submitted."
          />

          {/* 9. Related Products Grid */}
          <RelatedProducts products={related} />
        </div>
      </div>
    </div>
  );
}
