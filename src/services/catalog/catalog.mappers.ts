/**
 * Mappers from internal documents to PUBLIC DTOs.
 *
 * This is the security boundary for catalog reads: public responses are built
 * by EXPLICITLY listing allowed fields here. Internal-only fields (hsn, gstRate,
 * cost, supplier, internalNotes, searchTokens, isActive, timestamps) are never
 * copied, so they can never leak even if a document gains new internal fields.
 */
import type {
  Product,
  PublicProduct,
  Category,
  PublicCategory,
} from '@/types/catalog';

export function toPublicProduct(p: Product): PublicProduct {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    shortDescription: p.shortDescription,
    description: p.description,
    brand: p.brand,
    categoryId: p.categoryId,
    sku: p.sku,
    price: p.price,
    mrp: p.mrp,
    currency: p.currency,
    images: p.images,
    thumbnail: p.thumbnail,
    specifications: p.specifications,
    features: p.features,
    whatsInTheBox: p.whatsInTheBox,
    warranty: p.warranty,
    storySections: p.storySections ?? [],
    featureBlocks: p.featureBlocks ?? [],
    compatibility: p.compatibility ?? [],
    faqs: p.faqs ?? [],
    variants: p.variants ?? [],
    stockStatus: p.stockStatus,
    rating: p.rating,
    seo: p.seo,
  };
}

export function toPublicCategory(c: Category): PublicCategory {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image: c.image,
    sortOrder: c.sortOrder,
    seo: c.seo,
  };
}
