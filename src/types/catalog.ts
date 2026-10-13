/**
 * Catalog domain types.
 *
 * Two representations exist and must not be conflated:
 *  - `Product` / `Category`: the FULL internal document (server-side only). May
 *    contain internal/admin fields that must never reach the public API.
 *  - `PublicProduct` / `PublicCategory`: the ALLOW-LISTED shape returned to
 *    public clients. Only fields listed here are ever exposed.
 *
 * No product values are hardcoded anywhere — documents are seeded later by EVM.
 */

export type Currency = 'INR';

export type StockStatus = 'in_stock' | 'out_of_stock' | 'preorder';

export interface RatingSummary {
  /** Average rating; null until real reviews exist (never fabricated). */
  average: number | null;
  /** Number of ratings; 0 until real reviews exist. */
  count: number;
}

export interface ProductImage {
  /** Storage path or absolute URL. */
  url: string;
  /** Required for accessibility; describes the image. */
  alt: string;
  width?: number;
  height?: number;
}

export interface SpecificationGroup {
  /** e.g. "General", "Audio", "Battery". */
  group: string;
  items: { label: string; value: string }[];
}

export interface SeoMeta {
  title?: string;
  description?: string;
  keywords?: string[];
}

/** Product variant option (color swatches, capacity, storage tiers). */
export interface ProductVariant {
  id: string;
  type: 'color' | 'capacity' | 'storage' | 'style';
  label: string; // e.g. "Titanium", "10000 mAh", "256 GB"
  value: string; // hex color code (for swatches) or identifier
  sku?: string;
  price?: number | null; // optional override price in paise
  slug?: string; // optional linked sibling product slug
  inStock: boolean;
  /** Optional variant-specific gallery images; if empty, main product images are used. */
  images?: ProductImage[];
}

/** Narrative storytelling section for rich PDP experience. */
export interface StorySection {
  heading: string;
  description: string;
  image?: ProductImage | null;
}

/** Structured highlight / feature card with title and detailed copy. */
export interface FeatureBlock {
  title: string;
  description: string;
  icon?: string | null;
}

/** Question and answer pair for product FAQs. */
export interface ProductFaq {
  question: string;
  answer: string;
}

/**
 * FULL internal product document. Server-side only.
 * Public-exposed subset is defined by `PublicProduct` + the mapper.
 */
export interface Product {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  brand: string;
  categoryId: string;
  sku: string;

  /** Price/MRP in smallest currency unit (paise). Null until EVM provides. */
  price: number | null;
  mrp: number | null;
  currency: Currency;

  images: ProductImage[];
  thumbnail: ProductImage | null;

  specifications: SpecificationGroup[];
  features: string[];
  whatsInTheBox: string[];
  warranty: string | null;

  // Rich D2C PDP extensions (optional with safe backward-compatible defaults)
  storySections?: StorySection[];
  featureBlocks?: FeatureBlock[];
  compatibility?: string[];
  faqs?: ProductFaq[];
  variants?: ProductVariant[];

  stockStatus: StockStatus;
  rating: RatingSummary;

  seo: SeoMeta;

  isActive: boolean;

  /** Lowercased tokens for Firestore keyword search (title/sku/keywords). */
  searchTokens: string[];

  // ---- INTERNAL-ONLY fields (NEVER exposed publicly) ----------------------
  /** Shipping weight per unit in grams — used to compute shipment weight. */
  weightGrams?: number | null;
  /** Tax metadata — PENDING from EVM; internal, not for public DTO. */
  hsn?: string | null;
  gstRate?: number | null;
  /** Internal cost / supplier info — never public. */
  cost?: number | null;
  supplier?: string | null;
  internalNotes?: string | null;

  createdAt: string;
  updatedAt: string;
}

/** Public product shape returned by public catalog APIs (allow-listed). */
export interface PublicProduct {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  brand: string;
  categoryId: string;
  sku: string;
  price: number | null;
  mrp: number | null;
  currency: Currency;
  images: ProductImage[];
  thumbnail: ProductImage | null;
  specifications: SpecificationGroup[];
  features: string[];
  whatsInTheBox: string[];
  warranty: string | null;
  storySections?: StorySection[];
  featureBlocks?: FeatureBlock[];
  compatibility?: string[];
  faqs?: ProductFaq[];
  variants?: ProductVariant[];
  stockStatus: StockStatus;
  rating: RatingSummary;
  seo: SeoMeta;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: ProductImage | null;
  sortOrder: number;
  isActive: boolean;
  seo: SeoMeta;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: ProductImage | null;
  sortOrder: number;
  seo: SeoMeta;
}

// ---- Listing / query shapes -------------------------------------------------
export type ProductSort = 'newest' | 'price_asc' | 'price_desc';

export interface ProductListResult {
  items: PublicProduct[];
  /** Opaque cursor for the next page; null when no more results. */
  nextCursor: string | null;
}
