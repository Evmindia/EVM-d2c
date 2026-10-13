import { describe, it, expect } from 'vitest';
import { calculateView } from '@/services/cart/cart.calculator';
import type { Product } from '@/types/catalog';
import type { CartItem } from '@/services/cart/cart.types';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    slug: 'evm-earphones',
    title: 'EVM Earphones',
    shortDescription: '',
    description: '',
    brand: 'EVM',
    categoryId: 'c1',
    sku: 'SKU1',
    price: 49900,
    mrp: 79900,
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
    searchTokens: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function map(products: Product[]): Map<string, Product> {
  return new Map(products.map((p) => [p.id, p]));
}

describe('cart calculator — server price authority', () => {
  it('computes line totals and subtotal from CATALOG prices only', () => {
    const items: CartItem[] = [
      { productId: 'p1', quantity: 2 },
      { productId: 'p2', quantity: 1 },
    ];
    const products = map([
      product({ id: 'p1', price: 49900 }),
      product({ id: 'p2', price: 20000 }),
    ]);
    const view = calculateView(items, products, 'guest');
    expect(view.subtotal).toBe(49900 * 2 + 20000);
    expect(view.itemCount).toBe(3);
    expect(view.distinctCount).toBe(2);
    expect(view.lines[0]!.lineTotal).toBe(99800);
  });

  it('IGNORES any client-supplied price: only the product map matters', () => {
    // The calculator has no channel for a client price. Even a wildly different
    // "intended" price cannot change the result — it is derived from the catalog.
    const items: CartItem[] = [{ productId: 'p1', quantity: 1 }];
    const products = map([product({ id: 'p1', price: 49900 })]);
    const view = calculateView(items, products, 'guest');
    expect(view.subtotal).toBe(49900);
    // Recompute with a tampered product price to prove the source of truth.
    const tampered = map([product({ id: 'p1', price: 1 })]);
    expect(calculateView(items, tampered, 'guest').subtotal).toBe(1);
  });

  it('marks missing products unavailable and excludes them from subtotal', () => {
    const items: CartItem[] = [
      { productId: 'p1', quantity: 1 },
      { productId: 'ghost', quantity: 3 },
    ];
    const products = map([product({ id: 'p1', price: 10000 })]);
    const view = calculateView(items, products, 'user');
    expect(view.subtotal).toBe(10000);
    expect(view.hasUnavailable).toBe(true);
    const ghost = view.lines.find((l) => l.productId === 'ghost')!;
    expect(ghost.available).toBe(false);
    expect(ghost.lineTotal).toBeNull();
  });

  it('treats inactive products as unavailable (inactive injection guard)', () => {
    const items: CartItem[] = [{ productId: 'p1', quantity: 2 }];
    const products = map([product({ id: 'p1', isActive: false })]);
    const view = calculateView(items, products, 'guest');
    expect(view.subtotal).toBe(0);
    expect(view.lines[0]!.available).toBe(false);
  });

  it('excludes out-of-stock and unpriced lines from subtotal', () => {
    const items: CartItem[] = [
      { productId: 'oos', quantity: 1 },
      { productId: 'np', quantity: 1 },
    ];
    const products = map([
      product({ id: 'oos', price: 5000, stockStatus: 'out_of_stock' }),
      product({ id: 'np', price: null }),
    ]);
    const view = calculateView(items, products, 'guest');
    expect(view.subtotal).toBe(0);
    expect(view.hasUnavailable).toBe(true);
  });

  it('populates variantLabel, variantType, variantValue, and matching thumbnail for variant', () => {
    const items: CartItem[] = [
      { productId: 'p1', variantId: 'v_white', quantity: 1 },
      { productId: 'p1', variantId: 'v_black', quantity: 2 },
    ];
    const products = map([
      product({
        id: 'p1',
        title: 'Power Bank',
        price: 15000,
        images: [
          { url: '/images/black.jpg', alt: 'Power Bank Black' },
          { url: '/images/white.jpg', alt: 'Power Bank White' },
        ],
        variants: [
          {
            id: 'v_white',
            type: 'color',
            label: 'White',
            value: '#ffffff',
            inStock: true,
          },
          {
            id: 'v_black',
            type: 'color',
            label: 'Black',
            value: '#000000',
            inStock: true,
          },
        ],
      }),
    ]);
    const view = calculateView(items, products, 'guest');
    expect(view.lines).toHaveLength(2);

    const whiteLine = view.lines[0]!;
    expect(whiteLine.variantId).toBe('v_white');
    expect(whiteLine.variantLabel).toBe('White');
    expect(whiteLine.variantType).toBe('color');
    expect(whiteLine.variantValue).toBe('#ffffff');
    expect(whiteLine.thumbnailUrl).toBe('/images/white.jpg');

    const blackLine = view.lines[1]!;
    expect(blackLine.variantId).toBe('v_black');
    expect(blackLine.variantLabel).toBe('Black');
    expect(blackLine.variantType).toBe('color');
    expect(blackLine.variantValue).toBe('#000000');
    expect(blackLine.thumbnailUrl).toBe('/images/black.jpg');
  });

  it('treats an out-of-stock variant as unavailable even if base product has stock', () => {
    const items: CartItem[] = [{ productId: 'p1', variantId: 'v_sold_out', quantity: 1 }];
    const products = map([
      product({
        id: 'p1',
        stockStatus: 'in_stock',
        variants: [
          {
            id: 'v_sold_out',
            type: 'color',
            label: 'Gold',
            value: '#ffd700',
            inStock: false,
          },
        ],
      }),
    ]);
    const view = calculateView(items, products, 'guest');
    expect(view.hasUnavailable).toBe(true);
    expect(view.lines[0]!.available).toBe(false);
    expect(view.lines[0]!.stockStatus).toBe('out_of_stock');
    expect(view.subtotal).toBe(0);
  });

  it('prioritizes variant.images over label matching and product thumbnail', () => {
    const items: CartItem[] = [
      { productId: 'p1', variantId: 'v_silver', quantity: 1 },
      { productId: 'p1', variantId: 'v_space_gray', quantity: 1 },
    ];
    const products = map([
      product({
        id: 'p1',
        thumbnail: { url: '/images/default-thumb.jpg', alt: 'Default' },
        images: [
          { url: '/images/gallery-silver.jpg', alt: 'Silver' },
          { url: '/images/gallery-space-gray.jpg', alt: 'Space Gray' },
        ],
        variants: [
          {
            id: 'v_silver',
            type: 'color',
            label: 'Silver',
            value: '#c0c0c0',
            inStock: true,
            // Variant has explicit dedicated images
            images: [
              { url: '/images/variant-silver-dedicated.jpg', alt: 'Dedicated Silver' },
            ],
          },
          {
            id: 'v_space_gray',
            type: 'color',
            label: 'Space Gray',
            value: '#505050',
            inStock: true,
            // No dedicated images — should fall back to matching gallery photo
          },
        ],
      }),
    ]);
    const view = calculateView(items, products, 'guest');
    expect(view.lines).toHaveLength(2);

    const silverLine = view.lines[0]!;
    expect(silverLine.thumbnailUrl).toBe('/images/variant-silver-dedicated.jpg');

    const spaceGrayLine = view.lines[1]!;
    expect(spaceGrayLine.thumbnailUrl).toBe('/images/gallery-space-gray.jpg');
  });
});

