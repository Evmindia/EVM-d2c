import { describe, it, expect } from 'vitest';
import {
  productJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  websiteJsonLd,
  faqJsonLd,
} from '@/lib/seo/structured-data';
import type { PublicProduct } from '@/types/catalog';

function product(overrides: Partial<PublicProduct> = {}): PublicProduct {
  return {
    id: 'p1',
    slug: 'evm-wired-earphones',
    title: 'EVM Wired Earphones',
    shortDescription: 'Short desc',
    description: 'Desc',
    brand: 'EVM',
    categoryId: 'c1',
    sku: 'EVM-WE-001',
    price: null,
    mrp: null,
    currency: 'INR',
    images: [],
    thumbnail: null,
    specifications: [],
    features: [],
    whatsInTheBox: [],
    warranty: null,
    stockStatus: 'out_of_stock',
    rating: { average: null, count: 0 },
    seo: {},
    ...overrides,
  };
}

describe('Product JSON-LD — never fabricates offers/ratings', () => {
  it('omits offers when price is null', () => {
    const ld = productJsonLd(product());
    expect(ld).not.toHaveProperty('offers');
  });

  it('omits aggregateRating when there are no ratings', () => {
    const ld = productJsonLd(product({ rating: { average: null, count: 0 } }));
    expect(ld).not.toHaveProperty('aggregateRating');
  });

  it('includes offers ONLY when a real price exists', () => {
    const ld = productJsonLd(product({ price: 49900, stockStatus: 'in_stock' })) as {
      offers?: { price: string; availability: string };
    };
    expect(ld.offers?.price).toBe('499.00');
    expect(ld.offers?.availability).toContain('InStock');
  });

  it('includes aggregateRating and review schema ONLY when real ratings exist', () => {
    const ld = productJsonLd(product({ rating: { average: 4.5, count: 12 } })) as {
      aggregateRating?: { ratingValue: number; reviewCount: number; bestRating: number; worstRating: number };
      review?: { '@type': string; reviewRating: { ratingValue: number } }[];
    };
    expect(ld.aggregateRating?.ratingValue).toBe(4.5);
    expect(ld.aggregateRating?.reviewCount).toBe(12);
    expect(ld.aggregateRating?.bestRating).toBe(5);
    expect(ld.aggregateRating?.worstRating).toBe(1);
    expect(Array.isArray(ld.review)).toBe(true);
    expect(ld.review![0]?.['@type']).toBe('Review');
    expect(ld.review![0]?.reviewRating.ratingValue).toBe(5);
  });
});

describe('breadcrumb + organization JSON-LD', () => {
  it('builds an ordered breadcrumb list', () => {
    const ld = breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Products', path: '/products' },
    ]) as { itemListElement: { position: number }[] };
    expect(ld.itemListElement).toHaveLength(2);
    expect(ld.itemListElement[0]!.position).toBe(1);
  });

  it('organization has a name, url, and verified social handles', () => {
    const ld = organizationJsonLd() as { name: string; url: string; sameAs?: string[] };
    expect(ld.name).toBeTruthy();
    expect(ld.url).toBeTruthy();
    expect(Array.isArray(ld.sameAs)).toBe(true);
    expect(ld.sameAs!.length).toBeGreaterThan(0);
  });
});

describe('website + FAQ JSON-LD', () => {
  it('builds WebSite schema with SitelinksSearchBox potentialAction', () => {
    const ld = websiteJsonLd() as {
      '@type': string;
      potentialAction?: { target?: { urlTemplate?: string } };
    };
    expect(ld['@type']).toBe('WebSite');
    expect(ld.potentialAction?.target?.urlTemplate).toContain('?q={search_term_string}');
  });

  it('builds FAQPage schema when FAQs exist', () => {
    const faqs = [
      { question: 'What is the battery capacity?', answer: '10,000mAh lithium-polymer.' },
      { question: 'Does it support MagSafe?', answer: 'Yes, 15W fast magnetic wireless charging.' },
    ];
    const ld = faqJsonLd(faqs) as {
      '@type': string;
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity).toHaveLength(2);
    expect(ld.mainEntity[0]!.name).toBe('What is the battery capacity?');
    expect(ld.mainEntity[0]!.acceptedAnswer.text).toBe('10,000mAh lithium-polymer.');
  });

  it('returns null for empty FAQs', () => {
    expect(faqJsonLd([])).toBeNull();
  });
});

