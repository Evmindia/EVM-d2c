import { describe, it, expect } from 'vitest';
import { toPublicProduct, toPublicCategory } from '@/services/catalog/catalog.mappers';
import type { Product, Category } from '@/types/catalog';

function internalProduct(): Product {
  return {
    id: 'p1',
    slug: 'evm-power-bank',
    title: 'EVM Power Bank',
    shortDescription: 's',
    description: 'd',
    brand: 'EVM',
    categoryId: 'c1',
    sku: 'EVM-PB-001',
    price: 99900,
    mrp: 129900,
    currency: 'INR',
    images: [],
    thumbnail: null,
    specifications: [],
    features: [],
    whatsInTheBox: [],
    warranty: null,
    stockStatus: 'in_stock',
    rating: { average: null, count: 0 },
    seo: {},
    isActive: true,
    searchTokens: ['evm', 'power', 'bank'],
    // INTERNAL fields that must NEVER be exposed:
    hsn: '85076000',
    gstRate: 0.18,
    cost: 60000,
    supplier: 'ACME Supplier Pvt Ltd',
    internalNotes: 'negotiated margin',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };
}

describe('public product mapper — no internal field leakage', () => {
  it('omits all internal/admin fields from the public DTO', () => {
    const pub = toPublicProduct(internalProduct());
    const serialized = JSON.stringify(pub);
    for (const secret of ['hsn', 'gstRate', 'cost', 'supplier', 'internalNotes', 'searchTokens', 'isActive', 'createdAt', 'updatedAt']) {
      expect(pub).not.toHaveProperty(secret);
    }
    expect(serialized).not.toContain('ACME Supplier');
    expect(serialized).not.toContain('85076000');
    expect(serialized).not.toContain('negotiated');
  });

  it('keeps the expected public fields', () => {
    const pub = toPublicProduct(internalProduct());
    expect(pub.slug).toBe('evm-power-bank');
    expect(pub.price).toBe(99900);
    expect(pub.rating).toEqual({ average: null, count: 0 });
  });
});

describe('public category mapper', () => {
  it('omits isActive and timestamps', () => {
    const cat: Category = {
      id: 'c1',
      name: 'Power Bank',
      slug: 'power-bank',
      description: 'd',
      image: null,
      sortOrder: 1,
      isActive: true,
      seo: {},
      createdAt: 'x',
      updatedAt: 'y',
    };
    const pub = toPublicCategory(cat);
    expect(pub).not.toHaveProperty('isActive');
    expect(pub).not.toHaveProperty('createdAt');
    expect(pub.slug).toBe('power-bank');
  });
});
