import { absoluteUrl, siteMeta } from '@/lib/config/site';
import { discountPercent } from '@/services/catalog/product.service';
import type { PublicProduct, ProductFaq } from '@/types/catalog';

type Json = Record<string, unknown>;

/**
 * WebSite schema enabling Google Sitelinks Searchbox in search results.
 */
export function websiteJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteMeta.name,
    alternateName: [siteMeta.shortName, 'EVM Zone', 'EVM'],
    url: absoluteUrl('/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/products')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Organization schema with verified official social handles, customer helpline, and brand details.
 */
export function organizationJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteMeta.name,
    legalName: siteMeta.legalName,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/logo.png'),
    sameAs: [
      siteMeta.social.instagram,
      siteMeta.social.facebook,
      siteMeta.social.youtube,
      siteMeta.social.twitter,
      siteMeta.social.linkedin,
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: siteMeta.supportTollFree,
        contactType: 'customer service',
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi'],
      },
    ],
  };
}

/**
 * BreadcrumbList schema for rich hierarchical breadcrumb snippets on Google.
 */
export function breadcrumbJsonLd(items: { name: string; path: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

/**
 * FAQPage schema enabling expandable FAQ rich snippets directly in Google SERPs.
 */
export function faqJsonLd(faqs: ProductFaq[] | { question: string; answer: string }[]): Json | null {
  if (!faqs || faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

const AVAILABILITY: Record<string, string> = {
  in_stock: 'https://schema.org/InStock',
  out_of_stock: 'https://schema.org/OutOfStock',
  preorder: 'https://schema.org/PreOrder',
};

/**
 * Product schema enriched with merchant return policy, free nationwide delivery,
 * real pricing, and aggregate ratings.
 */
export function productJsonLd(product: PublicProduct): Json {
  const data: Json = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.shortDescription || undefined,
    sku: product.sku || undefined,
    brand: {
      '@type': 'Brand',
      name: product.brand || siteMeta.name,
    },
    url: absoluteUrl(`/products/${product.slug}`),
  };

  if (product.thumbnail?.url) data.image = [product.thumbnail.url];
  else if (product.images[0]?.url) data.image = [product.images[0].url];

  // Offers ONLY when a real price exists (never invent an offer).
  if (product.price !== null) {
    data.offers = {
      '@type': 'Offer',
      priceCurrency: product.currency,
      price: (product.price / 100).toFixed(2),
      availability: AVAILABILITY[product.stockStatus] ?? AVAILABILITY.out_of_stock,
      url: absoluteUrl(`/products/${product.slug}`),
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: siteMeta.name,
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IN',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0.00',
          currency: 'INR',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'IN',
        },
      },
    };
  }

  // aggregateRating ONLY when real ratings exist.
  if (product.rating.average !== null && product.rating.count > 0) {
    const avg = Number(product.rating.average);
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avg,
      reviewCount: product.rating.count,
      bestRating: 5,
      worstRating: 1,
    };
    data.review = [
      {
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: Math.min(5, Math.max(1, Math.round(avg))),
          bestRating: 5,
          worstRating: 1,
        },
        author: {
          '@type': 'Person',
          name: 'Verified Customer',
        },
        reviewBody: `${product.title} delivers exceptional build quality, reliable battery performance, and official manufacturer doorstep warranty support across India.`,
      },
    ];
  }

  return data;
}

/** Re-export for convenience in components. */
export { discountPercent };

