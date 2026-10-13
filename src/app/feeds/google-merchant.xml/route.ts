import { NextResponse } from 'next/server';
import { absoluteUrl, siteUrl, siteMeta } from '@/lib/config/site';
import { safeListProducts } from '@/services/catalog/catalog.read';
import type { PublicProduct } from '@/types/catalog';

export const dynamic = 'force-dynamic';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(str: string): string {
  return `<![CDATA[${str.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
}

function getGoogleProductCategory(title: string, slug: string): string {
  const t = `${title} ${slug}`.toLowerCase();
  if (t.includes('power bank') || t.includes('charger') || t.includes('magsafe')) {
    return 'Electronics > Power > Power Adapters &amp; Chargers';
  }
  if (t.includes('headphone') || t.includes('earphone') || t.includes('earbud') || t.includes('audio')) {
    return 'Electronics > Audio > Audio Components > Headphones &amp; Headsets';
  }
  if (t.includes('cable') || t.includes('type-c') || t.includes('lightning')) {
    return 'Electronics > Electronics Accessories > Cables > System &amp; Power Cables';
  }
  return 'Electronics > Electronics Accessories';
}

function renderProductItem(p: PublicProduct): string {
  // Google Merchant Center strictly rejects items without price
  if (p.price === null && p.mrp === null) return '';

  const mainImage = p.thumbnail?.url || p.images[0]?.url || absoluteUrl('/og-image.jpg');
  const additionalImages = p.images
    .filter((img) => img.url && img.url !== mainImage)
    .slice(0, 5);

  const pricePaise = p.price ?? p.mrp ?? 0;
  const mrpPaise = p.mrp;
  const hasSale = mrpPaise !== null && mrpPaise > pricePaise;

  const regularPriceStr = `${((hasSale ? mrpPaise : pricePaise) / 100).toFixed(2)} INR`;
  const salePriceStr = hasSale ? `${(pricePaise / 100).toFixed(2)} INR` : null;

  const availabilityMap: Record<string, string> = {
    in_stock: 'in_stock',
    out_of_stock: 'out_of_stock',
    preorder: 'preorder',
  };
  const availability = availabilityMap[p.stockStatus] ?? 'out_of_stock';
  const categoryStr = getGoogleProductCategory(p.title, p.slug);
  const mpn = p.sku || p.slug;

  const additionalImagesXml = additionalImages
    .map((img) => `      <g:additional_image_link>${escapeXml(img.url)}</g:additional_image_link>`)
    .join('\n');

  return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${cdata(p.title)}</g:title>
      <g:description>${cdata(p.description || p.shortDescription || p.title)}</g:description>
      <g:link>${escapeXml(absoluteUrl(`/products/${p.slug}`))}</g:link>
      <g:image_link>${escapeXml(mainImage)}</g:image_link>
${additionalImagesXml ? `${additionalImagesXml}\n` : ''}      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${regularPriceStr}</g:price>
${salePriceStr ? `      <g:sale_price>${salePriceStr}</g:sale_price>\n` : ''}      <g:brand>${escapeXml(p.brand || siteMeta.name)}</g:brand>
      <g:mpn>${escapeXml(mpn)}</g:mpn>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>${categoryStr}</g:google_product_category>
      <g:shipping>
        <g:country>IN</g:country>
        <g:service>Free Express Delivery Across India</g:service>
        <g:price>0.00 INR</g:price>
      </g:shipping>
      <g:custom_label_0>${escapeXml(p.stockStatus)}</g:custom_label_0>
      <g:custom_label_1>Free Doorstep Pickup Warranty</g:custom_label_1>
    </item>`;
}

export async function GET(): Promise<NextResponse> {
  const result = await safeListProducts({ limit: 500, sort: 'newest' });
  const products = result.items;

  const itemsXml = products
    .map((p) => renderProductItem(p))
    .filter(Boolean)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(siteMeta.name)} — Google Shopping &amp; Merchant Feed</title>
    <link>${escapeXml(siteUrl())}</link>
    <description>Official Free Listings and Google Shopping product inventory feed for ${escapeXml(siteMeta.name)} India.</description>
${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
