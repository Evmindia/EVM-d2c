import { describe, it, expect } from 'vitest';
import { productCreateSchema, productUpdateSchema } from '@/lib/validation/catalog';
import { toPublicProduct } from '@/services/catalog/catalog.mappers';
import type { Product } from '@/types/catalog';

describe('productCreateSchema & productUpdateSchema — backward compatibility & rich D2C fields', () => {
  const minimalValidProduct = {
    slug: 'evm-earphones-basic',
    title: 'EVM Basic Earphones',
    shortDescription: 'Reliable wired sound.',
    description: 'High-quality wired audio with 3.5mm jack.',
    brand: 'EVM',
    categoryId: 'cat_audio_123',
    sku: 'EVM-EAR-001',
    price: 49900,
    mrp: 99900,
    currency: 'INR' as const,
    images: [{ url: 'https://example.com/p1.jpg', alt: 'EVM Earphones' }],
    thumbnail: { url: 'https://example.com/p1.jpg', alt: 'EVM Earphones' },
    specifications: [
      {
        group: 'General',
        items: [{ label: 'Driver Size', value: '10mm' }],
      },
    ],
    features: ['10mm Dynamic Drivers', 'In-line Mic'],
    whatsInTheBox: ['1x Earphones', '2x Silicone Tips'],
    warranty: '1 Year Brand Warranty',
    stockStatus: 'in_stock' as const,
    seo: {
      title: 'EVM Basic Earphones',
      description: 'Reliable wired sound.',
    },
    isActive: true,
  };

  it('validates a legacy product missing all new optional fields', () => {
    const result = productCreateSchema.safeParse(minimalValidProduct);
    expect(result.success).toBe(true);
  });

  it('validates a rich D2C product with variants, storytelling, feature blocks, compatibility, and FAQs', () => {
    const richProduct = {
      ...minimalValidProduct,
      slug: 'evm-titan-10000mah-power-bank',
      title: 'EVM Titan 10000mAh Power Bank',
      variants: [
        {
          id: 'var-1',
          type: 'color' as const,
          label: 'Titanium',
          value: '#8B8D8F',
          inStock: true,
        },
        {
          id: 'var-2',
          type: 'color' as const,
          label: 'Matte Black',
          value: '#1C1C1E',
          inStock: true,
        },
      ],
      storySections: [
        {
          heading: 'Aerospace-Grade Aluminium Build',
          description: 'Crafted from aircraft-grade alloy for ultra-lightweight durability.',
          image: { url: 'https://example.com/craft.jpg', alt: 'Craft' },
        },
      ],
      featureBlocks: [
        {
          title: '15W Qi2 Fast Wireless',
          description: 'Next-gen magnetic wireless charging with thermal dissipation.',
          icon: '⚡',
        },
      ],
      compatibility: ['iPhone 16 / 15 Series', 'Qi2 Certified Devices', 'Samsung Galaxy S24'],
      faqs: [
        {
          question: 'Can this charge multiple devices simultaneously?',
          answer: 'Yes, via wireless pad and USB-C Power Delivery port.',
        },
      ],
    };

    const result = productCreateSchema.safeParse(richProduct);
    expect(result.success).toBe(true);
  });

  it('toPublicProduct safely defaults missing optional arrays to empty arrays', () => {
    const legacyDoc: Product = {
      id: 'doc-123',
      ...minimalValidProduct,
      rating: { average: null, count: 0 },
      searchTokens: ['evm', 'earphones'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const pub = toPublicProduct(legacyDoc);
    expect(pub.storySections).toEqual([]);
    expect(pub.featureBlocks).toEqual([]);
    expect(pub.compatibility).toEqual([]);
    expect(pub.faqs).toEqual([]);
    expect(pub.variants).toEqual([]);
  });

  it('productUpdateSchema accepts partial updates of rich D2C fields', () => {
    const patch = {
      storySections: [
        {
          heading: 'Updated Craftsmanship',
          description: 'Refined finish with bead-blasted texture.',
        },
      ],
    };
    const result = productUpdateSchema.safeParse(patch);
    expect(result.success).toBe(true);
  });

  it('validates variant with optional images array and preserves them', () => {
    const productWithVariantImages = {
      ...minimalValidProduct,
      slug: 'evm-color-variants-test',
      title: 'EVM Color Variants Test',
      variants: [
        {
          id: 'var-white',
          type: 'color' as const,
          label: 'White',
          value: '#FFFFFF',
          inStock: true,
          images: [
            { url: 'https://example.com/white-1.jpg', alt: 'White Front' },
            { url: 'https://example.com/white-2.jpg', alt: 'White Angle' },
          ],
        },
        {
          id: 'var-black',
          type: 'color' as const,
          label: 'Black',
          value: '#000000',
          inStock: true,
          // images is optional: omitting images is valid and supported
        },
      ],
    };

    const parsed = productCreateSchema.safeParse(productWithVariantImages);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.variants?.[0]?.images).toHaveLength(2);
      expect(parsed.data.variants?.[0]?.images?.[0]?.url).toBe('https://example.com/white-1.jpg');
      expect(parsed.data.variants?.[1]?.images).toBeUndefined();
    }
  });
});

