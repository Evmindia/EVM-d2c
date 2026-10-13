import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/feeds/google-merchant.xml/route';
import * as catalogRead from '@/services/catalog/catalog.read';
import type { PublicProduct } from '@/types/catalog';

vi.mock('@/services/catalog/catalog.read');

describe('Google Merchant Center XML Feed — GET /feeds/google-merchant.xml', () => {
  const mockProduct: PublicProduct = {
    id: 'p1',
    slug: 'evm-enmag-powerbank',
    title: 'EVM EnMag 10000mAh Magnetic Power Bank',
    shortDescription: '15W MagSafe fast charging battery pack.',
    description: 'Ultra slim aluminum 10000mAh magnetic power bank with Type-C 22.5W Power Delivery.',
    brand: 'EVM',
    categoryId: 'power-banks',
    sku: 'EVM-ENMAG-10K',
    price: 149900,
    mrp: 299900,
    currency: 'INR',
    images: [{ url: 'https://cdn.example.com/p1.jpg', alt: 'EVM EnMag Front' }],
    thumbnail: { url: 'https://cdn.example.com/p1-thumb.jpg', alt: 'EVM EnMag Thumb' },
    specifications: [],
    features: ['15W MagSafe Wireless', '22.5W Fast Charging'],
    whatsInTheBox: ['1x Power Bank', '1x Type-C Cable'],
    warranty: '2 Year Replacement Warranty',
    stockStatus: 'in_stock',
    rating: { average: 4.8, count: 142 },
    seo: {},
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders a valid Google Shopping RSS 2.0 feed with channel and items', async () => {
    vi.mocked(catalogRead.safeListProducts).mockResolvedValue({
      items: [mockProduct],
      nextCursor: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/xml');

    const xml = await res.text();
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    expect(xml).toContain('<g:title><![CDATA[EVM EnMag 10000mAh Magnetic Power Bank]]></g:title>');
    expect(xml).toContain('<g:id>p1</g:id>');
    expect(xml).toContain('<g:price>2999.00 INR</g:price>');
    expect(xml).toContain('<g:sale_price>1499.00 INR</g:sale_price>');
    expect(xml).toContain('<g:availability>in_stock</g:availability>');
    expect(xml).toContain('<g:brand>EVM</g:brand>');
    expect(xml).toContain('<g:mpn>EVM-ENMAG-10K</g:mpn>');
    expect(xml).toContain('<g:country>IN</g:country>');
    expect(xml).toContain('<g:price>0.00 INR</g:price>');
  });

  it('returns valid empty RSS feed when no products are listed', async () => {
    vi.mocked(catalogRead.safeListProducts).mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('<channel>');
    expect(xml).toContain('</channel>');
    expect(xml).not.toContain('<item>');
  });
});
