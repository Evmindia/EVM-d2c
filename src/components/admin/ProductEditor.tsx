'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type {
  Product,
  ProductImage,
  SpecificationGroup,
  ProductVariant,
  StorySection,
  FeatureBlock,
  ProductFaq,
  StockStatus,
} from '@/types/catalog';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface ProductEditorProps {
  initialProduct?: Product | null;
  mode: 'create' | 'edit';
}

const SECTIONS = [
  { id: 'basic', label: '1. Basic Info' },
  { id: 'media', label: '2. Media' },
  { id: 'pricing', label: '3. Pricing' },
  { id: 'variants', label: '4. Variants' },
  { id: 'inventory', label: '5. Inventory' },
  { id: 'tax', label: '6. Tax & HSN' },
  { id: 'story', label: '7. Storytelling' },
  { id: 'features', label: '8. Features' },
  { id: 'specs', label: '9. Specifications' },
  { id: 'compatibility', label: '10. Compatibility' },
  { id: 'faq', label: '11. FAQs' },
  { id: 'seo', label: '12. SEO' },
];

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

async function optimizeImageForUpload(
  file: File,
): Promise<{ blob: Blob; contentType: string; name: string }> {
  // If file is already moderately sized (< 3MB), upload as-is
  if (file.size <= 3 * 1024 * 1024) {
    return { blob: file, contentType: file.type, name: file.name };
  }

  // If file is large (> 3MB), compress/downsample via canvas for fast and reliable cloud upload
  if (typeof window === 'undefined') {
    return { blob: file, contentType: file.type, name: file.name };
  }

  return new Promise((resolve) => {
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 2500;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ blob: file, contentType: file.type, name: file.name });
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve({
              blob,
              contentType: 'image/jpeg',
              name: file.name.replace(/\.[^/.]+$/, '.jpg'),
            });
          } else {
            resolve({ blob: file, contentType: file.type, name: file.name });
          }
        },
        'image/jpeg',
        0.88,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ blob: file, contentType: file.type, name: file.name });
    };
    img.src = objectUrl;
  });
}

export const DRAFT_STORAGE_KEY_NEW = 'evm-product-draft-new';

export function getDraftStorageKey(mode: 'create' | 'edit', productId?: string | null): string {
  if (mode === 'create') return DRAFT_STORAGE_KEY_NEW;
  return productId ? `evm-product-draft-edit-${productId}` : 'evm-product-draft-edit';
}

export interface ProductDraftData {
  title: string;
  slug: string;
  sku: string;
  brand: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  isActive: boolean;
  stockStatus: StockStatus;
  priceRupees: string;
  mrpRupees: string;
  hsn: string;
  gstRate: string;
  images: ProductImage[];
  thumbnailUrl: string;
  variants: ProductVariant[];
  storySections: StorySection[];
  features: string[];
  featureBlocks: FeatureBlock[];
  specifications: SpecificationGroup[];
  compatibility: string[];
  whatsInTheBox: string[];
  warranty: string;
  faqs: ProductFaq[];
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  ratingAverage?: string;
  ratingCount?: string;
  savedAt: number;
}

export function saveProductDraft(key: string, data: Omit<ProductDraftData, 'savedAt'>): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const payload: ProductDraftData = {
      ...data,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadProductDraft(key: string): ProductDraftData | null {
  if (typeof window === 'undefined') return null;
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return null;
    const parsed = JSON.parse(item) as ProductDraftData;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearProductDraft(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

export function getSectionForField(field: string): string {
  const base = field.split('.')[0] || field;
  switch (base) {
    case 'title':
    case 'slug':
    case 'sku':
    case 'brand':
    case 'categoryId':
    case 'shortDescription':
    case 'description':
      return 'basic';
    case 'images':
    case 'thumbnail':
      return 'media';
    case 'price':
    case 'mrp':
    case 'currency':
      return 'pricing';
    case 'variants':
      return 'variants';
    case 'stockStatus':
    case 'isActive':
      return 'inventory';
    case 'hsn':
    case 'gstRate':
      return 'tax';
    case 'storySections':
      return 'story';
    case 'features':
    case 'featureBlocks':
      return 'features';
    case 'specifications':
    case 'whatsInTheBox':
    case 'warranty':
      return 'specs';
    case 'compatibility':
      return 'compatibility';
    case 'faqs':
      return 'faq';
    case 'seo':
      return 'seo';
    default:
      return 'basic';
  }
}

export function formatFieldLabel(field: string): string {
  const map: Record<string, string> = {
    title: 'Product Title',
    slug: 'URL Slug',
    sku: 'SKU',
    brand: 'Brand',
    categoryId: 'Category',
    shortDescription: 'Short Description',
    description: 'Description',
    price: 'Selling Price',
    mrp: 'MRP',
    images: 'Product Images',
    thumbnail: 'Thumbnail',
    stockStatus: 'Stock Status',
    hsn: 'HSN Code',
    gstRate: 'GST Rate',
    specifications: 'Specifications',
    features: 'Features',
    featureBlocks: 'Feature Highlights',
    storySections: 'Storytelling Sections',
    compatibility: 'Compatibility',
    whatsInTheBox: "What's in the Box",
    warranty: 'Warranty',
    faqs: 'FAQs',
    variants: 'Variants',
    'seo.title': 'SEO Meta Title',
    'seo.description': 'SEO Meta Description',
    'seo.keywords': 'SEO Keywords',
    seo: 'SEO Settings',
  };
  return map[field] || field.replace(/\./g, ' ');
}

export function ProductEditor({ initialProduct, mode }: ProductEditorProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState('basic');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState(initialProduct?.title ?? '');
  const [slug, setSlug] = useState(initialProduct?.slug ?? '');
  const [sku, setSku] = useState(initialProduct?.sku ?? '');
  const [brand, setBrand] = useState(initialProduct?.brand ?? 'EVM');
  const [categoryId, setCategoryId] = useState(initialProduct?.categoryId ?? '');
  const [shortDescription, setShortDescription] = useState(initialProduct?.shortDescription ?? '');
  const [description, setDescription] = useState(initialProduct?.description ?? '');
  const [isActive, setIsActive] = useState(initialProduct?.isActive ?? true);
  const [stockStatus, setStockStatus] = useState<StockStatus>(initialProduct?.stockStatus ?? 'in_stock');
  const [weightGrams, setWeightGrams] = useState<string>(
    initialProduct?.weightGrams != null ? String(initialProduct.weightGrams) : '',
  );

  // Pricing (stored as paise, edited as rupees)
  const [priceRupees, setPriceRupees] = useState<string>(
    initialProduct?.price ? (initialProduct.price / 100).toString() : '',
  );
  const [mrpRupees, setMrpRupees] = useState<string>(
    initialProduct?.mrp ? (initialProduct.mrp / 100).toString() : '',
  );

  // Tax & HSN
  const [hsn, setHsn] = useState(initialProduct?.hsn ?? '');
  const [gstRate, setGstRate] = useState<string>(
    initialProduct?.gstRate !== null && initialProduct?.gstRate !== undefined
      ? (initialProduct.gstRate * 100).toString()
      : '18',
  );

  // Media
  const [images, setImages] = useState<ProductImage[]>(initialProduct?.images ?? []);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(initialProduct?.thumbnail?.url ?? '');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showManualUrl, setShowManualUrl] = useState(false);

  // Variants
  const [variants, setVariants] = useState<ProductVariant[]>(initialProduct?.variants ?? []);
  const [variantUploadingIdx, setVariantUploadingIdx] = useState<number | null>(null);
  const [variantUploadError, setVariantUploadError] = useState<{ idx: number; message: string } | null>(null);
  const [showAttachGalleryForIdx, setShowAttachGalleryForIdx] = useState<number | null>(null);
  const [showManualUrlForIdx, setShowManualUrlForIdx] = useState<number | null>(null);
  const [variantManualUrl, setVariantManualUrl] = useState('');
  const [variantManualAlt, setVariantManualAlt] = useState('');

  // Storytelling Sections
  const [storySections, setStorySections] = useState<StorySection[]>(
    initialProduct?.storySections ?? [],
  );
  // Per-section image upload state (reuses the Media upload endpoint).
  const [storyUploadingIdx, setStoryUploadingIdx] = useState<number | null>(null);
  const [storyUploadError, setStoryUploadError] = useState<string | null>(null);
  const [storyUrlOpenIdx, setStoryUrlOpenIdx] = useState<number | null>(null);

  // Features / Highlights
  const [features, setFeatures] = useState<string[]>(initialProduct?.features ?? []);
  const [featureBlocks, setFeatureBlocks] = useState<FeatureBlock[]>(
    initialProduct?.featureBlocks ?? [],
  );

  // Specifications
  const [specifications, setSpecifications] = useState<SpecificationGroup[]>(
    initialProduct?.specifications ?? [
      {
        group: 'General',
        items: [
          { label: 'Brand', value: 'EVM' },
          { label: 'Model', value: '' },
          { label: 'Warranty', value: '1 Year' },
        ],
      },
    ],
  );

  // Compatibility
  const [compatibility, setCompatibility] = useState<string[]>(
    initialProduct?.compatibility ?? [],
  );
  const [newCompatItem, setNewCompatItem] = useState('');

  // What's in the box & Warranty
  const [whatsInTheBox, setWhatsInTheBox] = useState<string[]>(
    initialProduct?.whatsInTheBox ?? [],
  );
  const [warranty, setWarranty] = useState(initialProduct?.warranty ?? '1 Year Domestic Warranty');

  // FAQs
  const [faqs, setFaqs] = useState<ProductFaq[]>(initialProduct?.faqs ?? []);

  // SEO
  const [seoTitle, setSeoTitle] = useState(initialProduct?.seo?.title ?? '');
  const [seoDescription, setSeoDescription] = useState(initialProduct?.seo?.description ?? '');
  const [keywords, setKeywords] = useState(initialProduct?.seo?.keywords?.join(', ') ?? '');
  const [ratingAverage, setRatingAverage] = useState(
    initialProduct?.rating?.average !== null && initialProduct?.rating?.average !== undefined
      ? String(initialProduct.rating.average)
      : '',
  );
  const [ratingCount, setRatingCount] = useState(
    initialProduct?.rating?.count ? String(initialProduct.rating.count) : '',
  );

  // Draft Auto-Save State
  const storageKey = getDraftStorageKey(mode, initialProduct?.id);
  const [draftAvailable, setDraftAvailable] = useState<ProductDraftData | null>(() => {
    if (typeof window === 'undefined') return null;
    const existing = loadProductDraft(storageKey);
    if (!existing) return null;
    const hasContent =
      Boolean(existing.title?.trim()) ||
      Boolean(existing.description?.trim()) ||
      Boolean(existing.sku?.trim()) ||
      Boolean(existing.priceRupees) ||
      (Array.isArray(existing.images) && existing.images.length > 0) ||
      (Array.isArray(existing.variants) && existing.variants.length > 0) ||
      (Array.isArray(existing.features) && existing.features.length > 0);
    return hasContent ? existing : null;
  });
  const [showDraftBanner, setShowDraftBanner] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const existing = loadProductDraft(storageKey);
    if (!existing) return false;
    return (
      Boolean(existing.title?.trim()) ||
      Boolean(existing.description?.trim()) ||
      Boolean(existing.sku?.trim()) ||
      Boolean(existing.priceRupees) ||
      (Array.isArray(existing.images) && existing.images.length > 0) ||
      (Array.isArray(existing.variants) && existing.variants.length > 0) ||
      (Array.isArray(existing.features) && existing.features.length > 0)
    );
  });
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const isInitialMount = useRef(true);
  const isRestoringRef = useRef(false);

  // Load categories
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.data?.categories) {
          setCategories(d.data.categories);
          if (!categoryId && d.data.categories.length > 0) {
            setCategoryId(d.data.categories[0].id);
          }
        }
      })
      .catch(() => {});
  }, [categoryId]);

  // Restore draft handler
  function handleRestoreDraft() {
    if (!draftAvailable) return;
    isRestoringRef.current = true;
    if (typeof draftAvailable.title === 'string') setTitle(draftAvailable.title);
    if (typeof draftAvailable.slug === 'string') setSlug(draftAvailable.slug);
    if (typeof draftAvailable.sku === 'string') setSku(draftAvailable.sku);
    if (typeof draftAvailable.brand === 'string') setBrand(draftAvailable.brand);
    if (typeof draftAvailable.categoryId === 'string') setCategoryId(draftAvailable.categoryId);
    if (typeof draftAvailable.shortDescription === 'string')
      setShortDescription(draftAvailable.shortDescription);
    if (typeof draftAvailable.description === 'string')
      setDescription(draftAvailable.description);
    if (typeof draftAvailable.isActive === 'boolean') setIsActive(draftAvailable.isActive);
    if (draftAvailable.stockStatus) setStockStatus(draftAvailable.stockStatus);
    if (typeof draftAvailable.priceRupees === 'string')
      setPriceRupees(draftAvailable.priceRupees);
    if (typeof draftAvailable.mrpRupees === 'string') setMrpRupees(draftAvailable.mrpRupees);
    if (typeof draftAvailable.hsn === 'string') setHsn(draftAvailable.hsn);
    if (typeof draftAvailable.gstRate === 'string') setGstRate(draftAvailable.gstRate);
    if (Array.isArray(draftAvailable.images)) setImages(draftAvailable.images);
    if (typeof draftAvailable.thumbnailUrl === 'string')
      setThumbnailUrl(draftAvailable.thumbnailUrl);
    if (Array.isArray(draftAvailable.variants)) setVariants(draftAvailable.variants);
    if (Array.isArray(draftAvailable.storySections))
      setStorySections(draftAvailable.storySections);
    if (Array.isArray(draftAvailable.features)) setFeatures(draftAvailable.features);
    if (Array.isArray(draftAvailable.featureBlocks))
      setFeatureBlocks(draftAvailable.featureBlocks);
    if (Array.isArray(draftAvailable.specifications))
      setSpecifications(draftAvailable.specifications);
    if (Array.isArray(draftAvailable.compatibility))
      setCompatibility(draftAvailable.compatibility);
    if (Array.isArray(draftAvailable.whatsInTheBox))
      setWhatsInTheBox(draftAvailable.whatsInTheBox);
    if (typeof draftAvailable.warranty === 'string') setWarranty(draftAvailable.warranty);
    if (Array.isArray(draftAvailable.faqs)) setFaqs(draftAvailable.faqs);
    if (typeof draftAvailable.seoTitle === 'string') setSeoTitle(draftAvailable.seoTitle);
    if (typeof draftAvailable.seoDescription === 'string')
      setSeoDescription(draftAvailable.seoDescription);
    if (typeof draftAvailable.keywords === 'string') setKeywords(draftAvailable.keywords);
    if (typeof draftAvailable.ratingAverage === 'string') setRatingAverage(draftAvailable.ratingAverage);
    if (typeof draftAvailable.ratingCount === 'string') setRatingCount(draftAvailable.ratingCount);

    setShowDraftBanner(false);
    setDraftStatus('saved');
    if (draftAvailable.savedAt) {
      setLastSavedTime(
        new Date(draftAvailable.savedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    }
    setIsDirty(true);
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 100);
  }

  // Discard draft handler
  function handleDiscardDraft() {
    clearProductDraft(storageKey);
    setDraftAvailable(null);
    setShowDraftBanner(false);
    setDraftStatus('idle');
  }

  // Debounced Auto-save (800ms)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isRestoringRef.current) return;

    setIsDirty(true);
    setDraftStatus('saving');

    const timer = setTimeout(() => {
      const ok = saveProductDraft(storageKey, {
        title,
        slug,
        sku,
        brand,
        categoryId,
        shortDescription,
        description,
        isActive,
        stockStatus,
        priceRupees,
        mrpRupees,
        hsn,
        gstRate,
        images,
        thumbnailUrl,
        variants,
        storySections,
        features,
        featureBlocks,
        specifications,
        compatibility,
        whatsInTheBox,
        warranty,
        faqs,
        seoTitle,
        seoDescription,
        keywords,
        ratingAverage,
        ratingCount,
      });

      if (ok) {
        setDraftStatus('saved');
        setLastSavedTime(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        );
      } else {
        setDraftStatus('idle');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    storageKey,
    title,
    slug,
    sku,
    brand,
    categoryId,
    shortDescription,
    description,
    isActive,
    stockStatus,
    priceRupees,
    mrpRupees,
    hsn,
    gstRate,
    images,
    thumbnailUrl,
    variants,
    storySections,
    features,
    featureBlocks,
    specifications,
    compatibility,
    whatsInTheBox,
    warranty,
    faqs,
    seoTitle,
    seoDescription,
    keywords,
    ratingAverage,
    ratingCount,
  ]);

  // Accidental Navigation / Tab closing protection (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !saving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, saving]);

  // Auto-slug generator
  function generateSlug() {
    const s = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setSlug(s);
  }

  // Discount calculation
  const pNum = parseFloat(priceRupees);
  const mNum = parseFloat(mrpRupees);
  const discountPercent =
    !isNaN(pNum) && !isNaN(mNum) && mNum > 0 && pNum < mNum
      ? Math.round(((mNum - pNum) / mNum) * 100)
      : null;

  // File Upload Handler (Multi-image, validates type/size/magic-bytes with backend)
  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(`Processing ${files.length} file(s)...`);

    const newUploadedImages: ProductImage[] = [];
    const productIdParam = initialProduct?.id || 'draft-product';

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        setUploadProgress(`Uploading image ${i + 1} of ${files.length} (${file.name})...`);

        // 1. Client MIME type check
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          throw new Error(
            `File "${file.name}" is not a supported format. Please upload JPEG, PNG, or WebP images.`,
          );
        }

        // 2. Client size check
        if (file.size > MAX_FILE_BYTES) {
          throw new Error(
            `File "${file.name}" exceeds 25MB size limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
          );
        }

        // 3. Optimize large images if necessary (>3MB) for fast cloud transfer
        const optimized = await optimizeImageForUpload(file);

        // 4. Upload directly to Firebase Storage via secure server endpoint
        const formData = new FormData();
        formData.append('file', optimized.blob, optimized.name);

        const res = await fetch(`/api/admin/products/${productIdParam}/image-upload-url`, {
          method: 'POST',
          body: formData,
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            json.error?.message || `Server rejected file "${file.name}". Ensure it is a valid image.`,
          );
        }

        const realUrl = json.data.url;
        const cleanAlt = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .trim();

        newUploadedImages.push({
          url: realUrl,
          alt: cleanAlt || title || 'Product Image',
        });
      }

      const updated = [...images, ...newUploadedImages];
      setImages(updated);
      if (!thumbnailUrl && updated[0]) {
        setThumbnailUrl(updated[0].url);
      }
      setUploadProgress(null);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload images');
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  // Manual URL helper
  function addManualImageUrl() {
    if (!newImageUrl.trim()) return;
    const img: ProductImage = {
      url: newImageUrl.trim(),
      alt: newImageAlt.trim() || title || 'Product Image',
    };
    const next = [...images, img];
    setImages(next);
    if (!thumbnailUrl) setThumbnailUrl(img.url);
    setNewImageUrl('');
    setNewImageAlt('');
  }

  // Upload a single storytelling-section image to Firebase Storage (same secure
  // endpoint as the media gallery) and attach the returned URL to that section.
  async function uploadStorySectionImage(idx: number, file: File | null) {
    if (!file) return;
    setStoryUploadError(null);
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setStoryUploadError('Unsupported format. Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setStoryUploadError(`Image exceeds 25MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }
    setStoryUploadingIdx(idx);
    try {
      const optimized = await optimizeImageForUpload(file);
      const productIdParam = initialProduct?.id || 'draft-product';
      const formData = new FormData();
      formData.append('file', optimized.blob, optimized.name);
      const res = await fetch(`/api/admin/products/${productIdParam}/image-upload-url`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Server rejected the image. Ensure it is valid.');
      }
      const url: string = json.data.url;
      setStorySections((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, image: { url, alt: s.image?.alt || s.heading } } : s)),
      );
    } catch (err: unknown) {
      setStoryUploadError(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      setStoryUploadingIdx(null);
    }
  }

  // Variant image upload & management handlers
  async function uploadVariantImages(variantIdx: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    setVariantUploadError(null);
    setVariantUploadingIdx(variantIdx);

    try {
      const newUploaded: ProductImage[] = [];
      const productIdParam = initialProduct?.id || 'draft-product';
      const variantLabel = variants[variantIdx]?.label || `Variant ${variantIdx + 1}`;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          throw new Error(
            `File "${file.name}" is not a supported format. Please upload JPEG, PNG, or WebP images.`,
          );
        }
        if (file.size > MAX_FILE_BYTES) {
          throw new Error(
            `File "${file.name}" exceeds 25MB size limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
          );
        }

        const optimized = await optimizeImageForUpload(file);
        const formData = new FormData();
        formData.append('file', optimized.blob, optimized.name);

        const res = await fetch(`/api/admin/products/${productIdParam}/image-upload-url`, {
          method: 'POST',
          body: formData,
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            json.error?.message || `Server rejected file "${file.name}". Ensure it is a valid image.`,
          );
        }

        const realUrl = json.data.url;
        const cleanAlt = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .trim();

        newUploaded.push({
          url: realUrl,
          alt: `${title ? `${title} - ` : ''}${variantLabel} (${cleanAlt || 'Image'})`,
        });
      }

      setVariants((prev) =>
        prev.map((v, i) => {
          if (i !== variantIdx) return v;
          const existingImages = v.images || [];
          return {
            ...v,
            images: [...existingImages, ...newUploaded],
          };
        }),
      );
    } catch (err: unknown) {
      setVariantUploadError({
        idx: variantIdx,
        message: err instanceof Error ? err.message : 'Failed to upload variant images.',
      });
    } finally {
      setVariantUploadingIdx(null);
    }
  }

  function removeVariantImage(variantIdx: number, imgIdx: number) {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== variantIdx) return v;
        const existing = v.images || [];
        return {
          ...v,
          images: existing.filter((_, idx) => idx !== imgIdx),
        };
      }),
    );
  }

  function toggleAttachProductImage(variantIdx: number, img: ProductImage) {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== variantIdx) return v;
        const existing = v.images || [];
        const alreadyAttached = existing.some((item) => item.url === img.url);
        if (alreadyAttached) {
          return {
            ...v,
            images: existing.filter((item) => item.url !== img.url),
          };
        }
        return {
          ...v,
          images: [...existing, img],
        };
      }),
    );
  }

  function addManualVariantImage(variantIdx: number) {
    if (!variantManualUrl.trim()) return;
    const variantLabel = variants[variantIdx]?.label || `Variant ${variantIdx + 1}`;
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== variantIdx) return v;
        const existing = v.images || [];
        return {
          ...v,
          images: [
            ...existing,
            {
              url: variantManualUrl.trim(),
              alt: variantManualAlt.trim() || `${title ? `${title} - ` : ''}${variantLabel}`,
            },
          ],
        };
      }),
    );
    setVariantManualUrl('');
    setVariantManualAlt('');
    setShowManualUrlForIdx(null);
  }

  function removeImage(index: number) {
    const target = images[index];
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    if (target && thumbnailUrl === target.url) {
      setThumbnailUrl(next[0]?.url ?? '');
    }
  }

  function moveImage(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    const item = images[from];
    if (!item) return;
    const next = [...images];
    next.splice(from, 1);
    next.splice(to, 0, item);
    setImages(next);
  }

  // Save handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const pricePaise = priceRupees ? Math.round(parseFloat(priceRupees) * 100) : null;
    const mrpPaise = mrpRupees ? Math.round(parseFloat(mrpRupees) * 100) : null;

    if (pricePaise !== null && mrpPaise !== null && pricePaise > mrpPaise) {
      setError('Selling price cannot be greater than MRP.');
      setFieldErrors({ price: 'Selling price must be less than or equal to MRP.' });
      setActiveSection('pricing');
      setSaving(false);
      return;
    }

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      sku: sku.trim(),
      brand: brand.trim(),
      categoryId,
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      price: pricePaise,
      mrp: mrpPaise,
      currency: 'INR',
      images,
      thumbnail: thumbnailUrl ? { url: thumbnailUrl, alt: title } : null,
      specifications: specifications.filter((g) => g.items.some((it) => it.label && it.value)),
      features: features.filter((f) => f.trim().length > 0),
      featureBlocks: featureBlocks.filter((fb) => fb.title.trim() && fb.description.trim()),
      storySections: storySections.filter((s) => s.heading.trim() && s.description.trim()),
      compatibility: compatibility.filter((c) => c.trim().length > 0),
      whatsInTheBox: whatsInTheBox.filter((b) => b.trim().length > 0),
      warranty: warranty.trim() || null,
      faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
      variants,
      stockStatus,
      isActive,
      weightGrams: weightGrams.trim() ? parseInt(weightGrams, 10) : null,
      hsn: hsn.trim() || null,
      gstRate: gstRate ? parseFloat(gstRate) / 100 : null,
      seo: {
        title: seoTitle.trim() || undefined,
        description: seoDescription.trim() || undefined,
        keywords: keywords
          ? keywords
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean)
          : undefined,
      },
      rating:
        ratingAverage.trim() && ratingCount.trim()
          ? {
              average: Math.min(5, Math.max(1, parseFloat(ratingAverage))),
              count: Math.max(0, parseInt(ratingCount, 10)),
            }
          : undefined,
    };

    try {
      if (mode === 'create') {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          if (json.error?.fields && typeof json.error.fields === 'object') {
            setFieldErrors(json.error.fields);
            const firstField = Object.keys(json.error.fields)[0];
            if (firstField) {
              const targetSec = getSectionForField(firstField);
              setActiveSection(targetSec);
            }
          } else {
            setFieldErrors({});
          }
          throw new Error(json.error?.message || 'Failed to create product');
        }
        setFieldErrors({});
        clearProductDraft(storageKey);
        setIsDirty(false);
        setSuccess('Product created successfully!');
        router.push(`/admin/products/${json.data.product.id}`);
      } else if (mode === 'edit' && initialProduct) {
        const res = await fetch(`/api/admin/products/${initialProduct.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...payload, expectedUpdatedAt: initialProduct.updatedAt }),
        });
        const json = await res.json();
        if (!res.ok) {
          if (json.error?.fields && typeof json.error.fields === 'object') {
            setFieldErrors(json.error.fields);
            const firstField = Object.keys(json.error.fields)[0];
            if (firstField) {
              const targetSec = getSectionForField(firstField);
              setActiveSection(targetSec);
            }
          } else {
            setFieldErrors({});
          }
          throw new Error(json.error?.message || 'Failed to update product');
        }
        setFieldErrors({});
        clearProductDraft(storageKey);
        setIsDirty(false);
        setSuccess('Product updated successfully!');
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header & Save Bar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white/95 py-3 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {mode === 'create' ? 'Create New Product' : `Edit: ${initialProduct?.title || 'Product'}`}
          </h1>
          <p className="text-xs text-gray-500">Configure all storefront content, media, specs, and SEO.</p>
        </div>
        <div className="flex items-center gap-3">
          {draftStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              Saving draft…
            </span>
          )}
          {draftStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {lastSavedTime ? `Draft saved (${lastSavedTime})` : 'Draft saved'}
            </span>
          )}
          {draftStatus === 'idle' && isDirty && (
            <span className="text-xs text-gray-400">All changes saved</span>
          )}
          <button
            type="button"
            onClick={() => router.push('/admin/products')}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || isUploading}
            className="rounded-md bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Publish Product' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Draft Restore / Discard Banner */}
      {showDraftBanner && draftAvailable && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 font-bold text-amber-800">
              !
            </span>
            <div>
              <span className="font-semibold">You have an unsaved product draft</span>
              {draftAvailable.savedAt && (
                <span className="ml-1 text-amber-700">
                  (saved{' '}
                  {new Date(draftAvailable.savedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  )
                </span>
              )}
              <p className="text-amber-700">
                {draftAvailable.title ? `"${draftAvailable.title}"` : 'Untitled draft'} •{' '}
                {draftAvailable.images?.length || 0} image(s), {draftAvailable.variants?.length || 0} variant(s).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="rounded-md bg-amber-800 px-3 py-1.5 font-semibold text-white transition hover:bg-amber-900"
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="rounded-md border border-amber-300 bg-white px-3 py-1.5 font-medium text-amber-900 transition hover:bg-amber-50"
            >
              Discard Draft
            </button>
          </div>
        </div>
      )}

      {/* Error Banner with Field Breakdown */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 shadow-sm"
        >
          <div className="flex items-center gap-2 font-bold text-red-800 text-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-200 text-xs font-bold text-red-800">
              ✕
            </span>
            {error}
          </div>
          {Object.keys(fieldErrors).length > 0 && (
            <div className="mt-3 border-t border-red-200/80 pt-2.5">
              <p className="mb-1.5 font-semibold text-red-800">
                Please fix the following field(s) to continue:
              </p>
              <ul className="space-y-1.5 pl-1">
                {Object.entries(fieldErrors).map(([field, msg]) => {
                  const sec = getSectionForField(field);
                  const secLabel = SECTIONS.find((s) => s.id === sec)?.label || sec;
                  return (
                    <li key={field} className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-red-500">•</span>
                      <button
                        type="button"
                        onClick={() => setActiveSection(sec)}
                        className="font-semibold text-red-900 underline hover:text-red-700"
                      >
                        [{secLabel}] {formatFieldLabel(field)}:
                      </button>
                      <span className="font-medium text-red-700">{msg}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {success && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800">
          {success}
        </div>
      )}

      {/* 12-Section Navigation Bar */}
      <div className="flex overflow-x-auto border-b border-gray-200 pb-1 text-xs">
        {SECTIONS.map((sec) => {
          const sectionHasError = Object.keys(fieldErrors).some(
            (field) => getSectionForField(field) === sec.id,
          );
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`flex shrink-0 items-center gap-1.5 px-3 py-2 font-medium transition ${
                activeSection === sec.id
                  ? 'border-b-2 border-gray-900 text-gray-900'
                  : sectionHasError
                    ? 'font-semibold text-red-600 hover:text-red-800'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {sec.label}
              {sectionHasError && (
                <span
                  className="flex h-2 w-2 rounded-full bg-red-500"
                  title="Contains invalid fields"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: BASIC INFO */}
      {activeSection === 'basic' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">1. Basic Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">Product Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (fieldErrors.title) setFieldErrors((prev) => { const next = { ...prev }; delete next.title; return next; });
                }}
                placeholder="e.g. EVM Titan 10000mAh Magnetic Power Bank"
                className={`mt-1 h-10 w-full rounded-md border px-3 text-sm ${
                  fieldErrors.title ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500' : 'border-gray-300'
                }`}
              />
              {fieldErrors.title && <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.title}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-700">URL Slug *</label>
                <button
                  type="button"
                  onClick={generateSlug}
                  className="text-[11px] text-blue-600 underline hover:text-blue-800"
                >
                  Generate from title
                </button>
              </div>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  if (fieldErrors.slug) setFieldErrors((prev) => { const next = { ...prev }; delete next.slug; return next; });
                }}
                placeholder="e.g. evm-titan-10000mah-magnetic-power-bank"
                className={`mt-1 h-10 w-full rounded-md border px-3 text-sm ${
                  fieldErrors.slug ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500' : 'border-gray-300'
                }`}
              />
              {fieldErrors.slug && <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.slug}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">SKU *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value);
                  if (fieldErrors.sku) setFieldErrors((prev) => { const next = { ...prev }; delete next.sku; return next; });
                }}
                placeholder="e.g. EVM-PB-10K-TITAN"
                className={`mt-1 h-10 w-full rounded-md border px-3 text-sm ${
                  fieldErrors.sku ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500' : 'border-gray-300'
                }`}
              />
              {fieldErrors.sku && <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.sku}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Brand *</label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  if (fieldErrors.brand) setFieldErrors((prev) => { const next = { ...prev }; delete next.brand; return next; });
                }}
                className={`mt-1 h-10 w-full rounded-md border px-3 text-sm ${
                  fieldErrors.brand ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500' : 'border-gray-300'
                }`}
              />
              {fieldErrors.brand && <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.brand}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  if (fieldErrors.categoryId) setFieldErrors((prev) => { const next = { ...prev }; delete next.categoryId; return next; });
                }}
                className={`mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm ${
                  fieldErrors.categoryId ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500' : 'border-gray-300'
                }`}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.categoryId}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Short Summary Description</label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => {
                setShortDescription(e.target.value);
                if (fieldErrors.shortDescription) setFieldErrors((prev) => { const next = { ...prev }; delete next.shortDescription; return next; });
              }}
              placeholder="Brief 1-sentence value proposition shown below the title"
              className={`mt-1 h-10 w-full rounded-md border px-3 text-sm ${
                fieldErrors.shortDescription ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500' : 'border-gray-300'
              }`}
            />
            {fieldErrors.shortDescription && <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.shortDescription}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Long Product Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) setFieldErrors((prev) => { const next = { ...prev }; delete next.description; return next; });
              }}
              placeholder="Detailed product overview..."
              className={`mt-1 w-full rounded-md border p-3 text-sm ${
                fieldErrors.description ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500' : 'border-gray-300'
              }`}
            />
            {fieldErrors.description && <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.description}</p>}
          </div>
        </div>
      )}

      {/* SECTION 2: MEDIA UPLOADER */}
      {activeSection === 'media' && (
        <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">2. Product Media &amp; Gallery</h2>
              <p className="text-xs text-gray-500">
                Upload product photos (JPEG, PNG, WebP up to 5MB). Set the primary cover photo and reorder gallery items.
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                Recommended: <strong className="text-gray-500">1520 × 1302 px</strong> (≈7:6) on a clean
                white/transparent background for a consistent gallery.
              </p>
            </div>
          </div>

          {/* Upload Dropzone & Native File Picker */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 text-center transition hover:border-gray-900 hover:bg-gray-50"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              disabled={isUploading}
            />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-600 mb-3">
              📷
            </div>
            <p className="text-xs font-semibold text-gray-900">
              Click to select photos or drag &amp; drop images
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              Supported: JPEG, PNG, WebP (Max 25MB per file) · Multi-file upload supported
            </p>
            <button
              type="button"
              disabled={isUploading}
              className="mt-3 inline-flex items-center rounded-md bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {isUploading ? 'Validating & Uploading…' : 'Upload Images'}
            </button>
          </div>

          {/* Upload Progress & Errors */}
          {uploadProgress && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              <span className="animate-spin text-sm">⏳</span>
              <span>{uploadProgress}</span>
            </div>
          )}
          {uploadError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <strong>Upload Error:</strong> {uploadError}
            </div>
          )}

          {/* Gallery items list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-800">
                Gallery Photos ({images.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowManualUrl(!showManualUrl)}
                className="text-[11px] text-blue-600 underline hover:text-blue-800"
              >
                {showManualUrl ? 'Hide Direct URL Input' : '+ Add via Direct URL'}
              </button>
            </div>

            {/* Optional Direct URL Fallback */}
            {showManualUrl && (
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600">Image URL</label>
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="mt-1 h-8 w-full rounded border border-gray-300 px-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600">Alt Text</label>
                    <input
                      type="text"
                      value={newImageAlt}
                      onChange={(e) => setNewImageAlt(e.target.value)}
                      placeholder="e.g. Side Profile View"
                      className="mt-1 h-8 w-full rounded border border-gray-300 px-2 text-xs"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addManualImageUrl}
                  className="rounded bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-800"
                >
                  Add URL
                </button>
              </div>
            )}

            {images.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center border border-dashed rounded-lg">
                No images in gallery. Upload images above to populate the product media.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((img, i) => {
                  const isPrimary = (thumbnailUrl === img.url) || (!thumbnailUrl && i === 0);
                  return (
                    <div
                      key={i}
                      className={`relative rounded-xl border p-3 flex gap-3 items-start transition ${
                        isPrimary ? 'border-gray-900 ring-2 ring-gray-900 bg-white shadow-sm' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 border border-gray-200">
                        <Image
                          src={img.url}
                          alt={img.alt || 'Product thumbnail'}
                          fill
                          unoptimized
                          sizes="80px"
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          {isPrimary ? (
                            <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              ★ Primary Cover
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setThumbnailUrl(img.url)}
                              className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-100"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="text-[11px] text-red-600 hover:underline"
                            title="Remove image"
                          >
                            Remove
                          </button>
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-gray-500">Alt Label</label>
                          <input
                            type="text"
                            value={img.alt}
                            onChange={(e) => {
                              const next = images.map((im, idx) =>
                                idx === i ? { ...im, alt: e.target.value } : im,
                              );
                              setImages(next);
                            }}
                            placeholder="Accessibility label"
                            className="mt-0.5 h-7 w-full rounded border border-gray-200 px-1.5 text-[11px]"
                          />
                        </div>

                        <div className="flex items-center gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => moveImage(i, i - 1)}
                            disabled={i === 0}
                            className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700 disabled:opacity-30 hover:bg-gray-200"
                            title="Move left/up"
                          >
                            ◀ Move
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(i, i + 1)}
                            disabled={i === images.length - 1}
                            className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700 disabled:opacity-30 hover:bg-gray-200"
                            title="Move right/down"
                          >
                            Move ▶
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: PRICING */}
      {activeSection === 'pricing' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">3. Pricing &amp; Commercials</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">Selling Price (₹ INR) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                placeholder="e.g. 1999"
                className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Maximum Retail Price / MRP (₹ INR) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={mrpRupees}
                onChange={(e) => setMrpRupees(e.target.value)}
                placeholder="e.g. 2999"
                className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm font-medium"
              />
            </div>
          </div>

          {discountPercent !== null && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800">
              <span className="font-semibold">{discountPercent}% OFF</span> will be displayed on the storefront.
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3 text-xs text-gray-600">
            <strong>Tax Policy:</strong> Storefront consumer prices in India are displayed inclusive of GST. Tax details are itemized at checkout.
          </div>
        </div>
      )}

      {/* SECTION 4: VARIANTS */}
      {activeSection === 'variants' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">4. Product Variants</h2>
              <p className="text-xs text-gray-500">Configure selectable colors, capacities, or storage sizes.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setVariants((v) => [
                  ...v,
                  {
                    id: crypto.randomUUID(),
                    type: 'color',
                    label: 'New Variant',
                    value: '#000000',
                    inStock: true,
                  },
                ])
              }
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
            >
              + Add Variant
            </button>
          </div>

          {variants.length === 0 ? (
            <p className="text-xs text-gray-500">No variants configured. Product will be sold as a single SKU.</p>
          ) : (
            <div className="space-y-4">
              {variants.map((variant, idx) => (
                <div
                  key={variant.id}
                  className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3.5"
                >
                  {/* Primary Variant Attributes */}
                  <div className="grid gap-3 sm:grid-cols-6 items-center">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600">Type</label>
                      <select
                        value={variant.type}
                        onChange={(e) => {
                          setVariants(
                            variants.map((v, i) =>
                              i === idx ? { ...v, type: e.target.value as ProductVariant['type'] } : v,
                            ),
                          );
                        }}
                        className="mt-1 h-8 w-full rounded border border-gray-300 bg-white text-xs px-2"
                      >
                        <option value="color">Color</option>
                        <option value="capacity">Capacity</option>
                        <option value="storage">Storage</option>
                        <option value="style">Style</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600">Label</label>
                      <input
                        type="text"
                        value={variant.label}
                        onChange={(e) => {
                          setVariants(
                            variants.map((v, i) => (i === idx ? { ...v, label: e.target.value } : v)),
                          );
                        }}
                        placeholder="e.g. Titanium"
                        className="mt-1 h-8 w-full rounded border border-gray-300 px-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600">
                        {variant.type === 'color' ? 'Hex Color' : 'Value'}
                      </label>
                      <div className="flex items-center gap-1.5 mt-1">
                        {variant.type === 'color' && (
                          <input
                            type="color"
                            value={variant.value.startsWith('#') ? variant.value : '#000000'}
                            onChange={(e) => {
                              setVariants(
                                variants.map((v, i) =>
                                  i === idx ? { ...v, value: e.target.value } : v,
                                ),
                              );
                            }}
                            className="h-8 w-8 rounded border border-gray-300 p-0"
                          />
                        )}
                        <input
                          type="text"
                          value={variant.value}
                          onChange={(e) => {
                            setVariants(
                              variants.map((v, i) => (i === idx ? { ...v, value: e.target.value } : v)),
                            );
                          }}
                          placeholder="#8B8D8F"
                          className="h-8 w-full rounded border border-gray-300 px-2 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600">SKU Override</label>
                      <input
                        type="text"
                        value={variant.sku ?? ''}
                        onChange={(e) => {
                          setVariants(
                            variants.map((v, i) => (i === idx ? { ...v, sku: e.target.value } : v)),
                          );
                        }}
                        placeholder="Optional"
                        className="mt-1 h-8 w-full rounded border border-gray-300 px-2 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <label className="flex items-center gap-1.5 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={variant.inStock}
                          onChange={(e) => {
                            setVariants(
                              variants.map((v, i) =>
                                i === idx ? { ...v, inStock: e.target.checked } : v,
                              ),
                            );
                          }}
                        />
                        In Stock
                      </label>
                    </div>
                    <div className="text-right pt-4">
                      <button
                        type="button"
                        onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                        className="text-xs text-red-600 underline hover:text-red-800"
                      >
                        Delete Variant
                      </button>
                    </div>
                  </div>

                  {/* Variant-Specific Photos (Optional) */}
                  <div className="rounded-md border border-gray-200/90 bg-white p-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-800">
                            Variant Photos ({variant.images?.length || 0})
                          </span>
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                            Optional
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Agar alag images nahi dali, toh storefront main product images use karega.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label
                          className={`inline-flex items-center gap-1 rounded bg-gray-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-xs hover:bg-gray-800 cursor-pointer ${
                            variantUploadingIdx === idx ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            disabled={variantUploadingIdx === idx}
                            onChange={(e) => {
                              uploadVariantImages(idx, e.target.files);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                          {variantUploadingIdx === idx ? 'Uploading…' : '+ Upload Photos'}
                        </label>

                        {images.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowAttachGalleryForIdx(showAttachGalleryForIdx === idx ? null : idx)
                            }
                            className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {showAttachGalleryForIdx === idx
                              ? 'Close Gallery'
                              : `Pick from Media (${images.length})`}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setShowManualUrlForIdx(showManualUrlForIdx === idx ? null : idx)
                          }
                          className="text-[11px] text-blue-600 underline hover:text-blue-800"
                        >
                          {showManualUrlForIdx === idx ? 'Close URL' : '+ URL'}
                        </button>
                      </div>
                    </div>

                    {/* Upload error display for this variant */}
                    {variantUploadError?.idx === idx && (
                      <div
                        role="alert"
                        className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700"
                      >
                        <strong>Upload Error:</strong> {variantUploadError.message}
                      </div>
                    )}

                    {/* Manual URL Input */}
                    {showManualUrlForIdx === idx && (
                      <div className="rounded border border-gray-200 bg-gray-50/70 p-2.5 space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            value={variantManualUrl}
                            onChange={(e) => setVariantManualUrl(e.target.value)}
                            className="h-7 w-full rounded border border-gray-300 px-2 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Alt text (optional)"
                            value={variantManualAlt}
                            onChange={(e) => setVariantManualAlt(e.target.value)}
                            className="h-7 w-full rounded border border-gray-300 px-2 text-xs"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowManualUrlForIdx(null);
                              setVariantManualUrl('');
                              setVariantManualAlt('');
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => addManualVariantImage(idx)}
                            className="rounded bg-gray-900 px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800"
                          >
                            Add Photo
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Pick from Media Gallery */}
                    {showAttachGalleryForIdx === idx && images.length > 0 && (
                      <div className="rounded border border-blue-200 bg-blue-50/40 p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-blue-900">
                            Click photos to toggle them for {variant.label || `Variant ${idx + 1}`}:
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAttachGalleryForIdx(null)}
                            className="text-[10px] text-blue-700 underline"
                          >
                            Done
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {images.map((img, imgIdx) => {
                            const isAttached = variant.images?.some((vi) => vi.url === img.url);
                            return (
                              <button
                                key={imgIdx}
                                type="button"
                                onClick={() => toggleAttachProductImage(idx, img)}
                                className={`relative h-12 w-12 rounded border-2 overflow-hidden transition ${
                                  isAttached
                                    ? 'border-blue-600 ring-2 ring-blue-500 shadow-sm'
                                    : 'border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-400'
                                }`}
                                title={isAttached ? 'Click to detach' : 'Click to attach'}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img.url}
                                  alt={img.alt || 'Gallery photo'}
                                  className="h-full w-full object-cover"
                                />
                                {isAttached && (
                                  <div className="absolute inset-0 bg-blue-600/35 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold drop-shadow">✓</span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Current Variant Images Thumbnail Tray */}
                    {variant.images && variant.images.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {variant.images.map((img, vImgIdx) => (
                          <div
                            key={vImgIdx}
                            className="group relative h-14 w-14 overflow-hidden rounded border border-gray-200 bg-gray-100 shadow-2xs"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={img.alt || variant.label}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeVariantImage(idx, vImgIdx)}
                              aria-label={`Remove image ${vImgIdx + 1} from ${variant.label}`}
                              className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow hover:bg-red-700"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded bg-gray-50 px-2 py-1 text-[11px] text-gray-500 border border-dashed border-gray-200">
                        No photos assigned to this variant. Storefront will fallback to main product photos.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: INVENTORY */}
      {activeSection === 'inventory' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">5. Inventory &amp; Availability</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">Shipping Weight (grams)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                placeholder="e.g. 250"
                className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Used to calculate the shipment weight sent to the courier (via eShipz).
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Stock Status</label>
              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value as StockStatus)}
                className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="in_stock">In Stock (Available for purchase)</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="preorder">Pre-Order</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Store Visibility</label>
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>Active (Visible on public storefront)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: TAX & HSN */}
      {activeSection === 'tax' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">6. Tax &amp; HSN Classification</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">HSN Code</label>
              <input
                type="text"
                value={hsn}
                onChange={(e) => setHsn(e.target.value)}
                placeholder="e.g. 85044090 (Power Bank) or 85183000 (Earphones)"
                className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">GST Slab (%)</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="0">0% (Nil / Exempt)</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST (Standard Consumer Electronics)</option>
                <option value="28">28% GST</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: STORYTELLING */}
      {activeSection === 'story' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">7. Storytelling &amp; Narrative Sections</h2>
              <p className="text-xs text-gray-500">Rich marketing sections showcasing product craft, materials, and lifestyle.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setStorySections((s) => [
                  ...s,
                  { heading: 'New Story Section', description: '', image: null },
                ])
              }
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
            >
              + Add Section
            </button>
          </div>

          {storySections.length === 0 ? (
            <p className="text-xs text-gray-500">No storytelling sections yet.</p>
          ) : (
            <div className="space-y-4">
              {storySections.map((sec, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Section {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setStorySections(storySections.filter((_, i) => i !== idx))}
                      className="text-xs text-red-600 underline"
                    >
                      Delete Section
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600">Heading</label>
                    <input
                      type="text"
                      value={sec.heading}
                      onChange={(e) => {
                        setStorySections(
                          storySections.map((s, i) =>
                            i === idx ? { ...s, heading: e.target.value } : s,
                          ),
                        );
                      }}
                      placeholder="e.g. Aerospace-Grade Aluminium Build"
                      className="mt-1 h-9 w-full rounded border border-gray-300 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600">Description</label>
                    <textarea
                      rows={3}
                      value={sec.description}
                      onChange={(e) => {
                        setStorySections(
                          storySections.map((s, i) =>
                            i === idx ? { ...s, description: e.target.value } : s,
                          ),
                        );
                      }}
                      placeholder="Detailed narrative copy..."
                      className="mt-1 w-full rounded border border-gray-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600">
                      Section Image (Optional)
                    </label>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      Recommended: <strong className="text-gray-500">1520 × 1216 px</strong> (5:4 ratio,
                      2× of 760×608) · JPG, PNG or WebP · under 5MB
                    </p>

                    {/* Current image preview */}
                    {sec.image?.url && (
                      <div className="mt-2 flex items-center gap-3">
                        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                          <Image
                            src={sec.image.url}
                            alt={sec.image.alt || sec.heading}
                            fill
                            unoptimized
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setStorySections(
                              storySections.map((s, i) => (i === idx ? { ...s, image: null } : s)),
                            )
                          }
                          className="text-[11px] text-red-600 underline hover:text-red-800"
                        >
                          Remove image
                        </button>
                      </div>
                    )}

                    {/* Upload button + URL toggle */}
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <label
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 ${
                          storyUploadingIdx !== null ? 'pointer-events-none opacity-50' : ''
                        }`}
                      >
                        {storyUploadingIdx === idx
                          ? 'Uploading…'
                          : sec.image?.url
                            ? 'Replace Image'
                            : '⬆ Upload Image'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={storyUploadingIdx !== null}
                          onChange={(e) => {
                            uploadStorySectionImage(idx, e.target.files?.[0] ?? null);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setStoryUrlOpenIdx(storyUrlOpenIdx === idx ? null : idx)}
                        className="text-[11px] text-blue-600 underline hover:text-blue-800"
                      >
                        {storyUrlOpenIdx === idx ? 'Hide URL input' : 'or paste a URL'}
                      </button>
                    </div>

                    {storyUploadError && storyUploadingIdx === null && (
                      <p className="mt-1.5 text-[11px] font-medium text-red-600">{storyUploadError}</p>
                    )}

                    {/* Optional direct-URL fallback */}
                    {storyUrlOpenIdx === idx && (
                      <input
                        type="url"
                        value={sec.image?.url ?? ''}
                        onChange={(e) => {
                          setStorySections(
                            storySections.map((s, i) =>
                              i === idx
                                ? {
                                    ...s,
                                    image: e.target.value
                                      ? { url: e.target.value, alt: s.image?.alt || s.heading }
                                      : null,
                                  }
                                : s,
                            ),
                          );
                        }}
                        placeholder="https://..."
                        className="mt-2 h-9 w-full rounded border border-gray-300 px-3 text-xs"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 8: FEATURES */}
      {activeSection === 'features' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">8. Feature Highlights</h2>
              <p className="text-xs text-gray-500">Structured feature blocks displayed on the PDP grid.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFeatureBlocks((fb) => [...fb, { title: 'New Feature', description: '' }])
              }
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
            >
              + Add Feature Block
            </button>
          </div>

          {/* Bullet Features Input */}
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-2">
            <label className="block text-xs font-semibold text-gray-800">
              Quick Bullet Highlights (One per line)
            </label>
            <textarea
              rows={4}
              value={features.join('\n')}
              onChange={(e) =>
                setFeatures(
                  e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              placeholder="15W Qi2 Fast Wireless Charging&#10;Aerospace-Grade Aluminium Frame&#10;Multi-Device Pass-Through Support"
              className="w-full rounded border border-gray-300 p-2.5 text-xs text-gray-800"
            />
          </div>

          {featureBlocks.length === 0 ? (
            <p className="text-xs text-gray-500">No structured feature blocks added yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {featureBlocks.map((fb, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-medium text-gray-600">Feature {idx + 1}</label>
                    <button
                      type="button"
                      onClick={() => setFeatureBlocks(featureBlocks.filter((_, i) => i !== idx))}
                      className="text-xs text-red-600 underline"
                    >
                      Delete
                    </button>
                  </div>
                  <input
                    type="text"
                    value={fb.title}
                    onChange={(e) => {
                      setFeatureBlocks(
                        featureBlocks.map((b, i) => (i === idx ? { ...b, title: e.target.value } : b)),
                      );
                    }}
                    placeholder="e.g. 15W Qi2 Fast Wireless"
                    className="h-8 w-full rounded border border-gray-300 px-2 text-xs font-medium"
                  />
                  <textarea
                    rows={2}
                    value={fb.description}
                    onChange={(e) => {
                      setFeatureBlocks(
                        featureBlocks.map((b, i) =>
                          i === idx ? { ...b, description: e.target.value } : b,
                        ),
                      );
                    }}
                    placeholder="Short feature explanation..."
                    className="w-full rounded border border-gray-300 p-2 text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 9: SPECIFICATIONS */}
      {activeSection === 'specs' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">9. Technical Specifications &amp; Box Contents</h2>
              <p className="text-xs text-gray-500">Grouped technical specification key-value tables and package items.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSpecifications((s) => [
                  ...s,
                  { group: 'New Group', items: [{ label: '', value: '' }] },
                ])
              }
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
            >
              + Add Spec Group
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-800">
                Package Contents / What&apos;s in the box (One per line)
              </label>
              <textarea
                rows={3}
                value={whatsInTheBox.join('\n')}
                onChange={(e) =>
                  setWhatsInTheBox(
                    e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="1 × EVM Power Bank&#10;1 × Braided Type-C Cable (1m)&#10;1 × User Manual"
                className="mt-1 w-full rounded border border-gray-300 p-2.5 text-xs text-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-800">Warranty Policy</label>
              <input
                type="text"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                placeholder="e.g. 1 Year Domestic Brand Warranty"
                className="mt-1 h-9 w-full rounded border border-gray-300 px-3 text-xs text-gray-800"
              />
            </div>
          </div>

          <div className="space-y-4">
            {specifications.map((group, gi) => (
              <div key={gi} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <input
                    type="text"
                    value={group.group}
                    onChange={(e) => {
                      setSpecifications(
                        specifications.map((g, i) =>
                          i === gi ? { ...g, group: e.target.value } : g,
                        ),
                      );
                    }}
                    placeholder="Group Name (e.g. Battery & Power)"
                    className="h-8 rounded border border-gray-300 px-2 text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setSpecifications(specifications.filter((_, i) => i !== gi))}
                    className="text-xs text-red-600 underline"
                  >
                    Delete Group
                  </button>
                </div>

                <div className="space-y-2">
                  {group.items.map((item, ii) => (
                    <div key={ii} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          setSpecifications(
                            specifications.map((g, gIdx) =>
                              gIdx === gi
                                ? {
                                    ...g,
                                    items: g.items.map((it, itIdx) =>
                                      itIdx === ii ? { ...it, label: e.target.value } : it,
                                    ),
                                  }
                                : g,
                            ),
                          );
                        }}
                        placeholder="Label (e.g. Capacity)"
                        className="h-8 w-1/3 rounded border border-gray-300 px-2 text-xs"
                      />
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => {
                          setSpecifications(
                            specifications.map((g, gIdx) =>
                              gIdx === gi
                                ? {
                                    ...g,
                                    items: g.items.map((it, itIdx) =>
                                      itIdx === ii ? { ...it, value: e.target.value } : it,
                                    ),
                                  }
                                : g,
                            ),
                          );
                        }}
                        placeholder="Value (e.g. 10000 mAh / 38.5Wh)"
                        className="h-8 flex-1 rounded border border-gray-300 px-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSpecifications(
                            specifications.map((g, gIdx) =>
                              gIdx === gi
                                ? { ...g, items: g.items.filter((_, itIdx) => itIdx !== ii) }
                                : g,
                            ),
                          );
                        }}
                        className="text-gray-400 hover:text-red-600 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSpecifications(
                      specifications.map((g, gIdx) =>
                        gIdx === gi ? { ...g, items: [...g.items, { label: '', value: '' }] } : g,
                      ),
                    );
                  }}
                  className="text-xs text-blue-600 underline hover:text-blue-800"
                >
                  + Add Row
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 10: COMPATIBILITY */}
      {activeSection === 'compatibility' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">10. Device &amp; Ecosystem Compatibility</h2>
          <p className="text-xs text-gray-500">List compatible phone models, operating systems, and standards.</p>

          <div className="flex gap-2">
            <input
              type="text"
              value={newCompatItem}
              onChange={(e) => setNewCompatItem(e.target.value)}
              placeholder="e.g. iPhone 16 / 15 / 14 / 13 / 12 Series"
              className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-xs"
            />
            <button
              type="button"
              onClick={() => {
                if (!newCompatItem.trim()) return;
                setCompatibility((c) => [...c, newCompatItem.trim()]);
                setNewCompatItem('');
              }}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Add Item
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {compatibility.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => setCompatibility(compatibility.filter((_, i) => i !== idx))}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 11: FAQS */}
      {activeSection === 'faq' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">11. Frequently Asked Questions</h2>
              <p className="text-xs text-gray-500">Add questions and answers to render as expandable accordions.</p>
            </div>
            <button
              type="button"
              onClick={() => setFaqs((f) => [...f, { question: '', answer: '' }])}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
            >
              + Add FAQ
            </button>
          </div>

          {faqs.length === 0 ? (
            <p className="text-xs text-gray-500">No FAQs configured yet.</p>
          ) : (
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-medium text-gray-600">Question {idx + 1}</label>
                    <button
                      type="button"
                      onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))}
                      className="text-xs text-red-600 underline"
                    >
                      Delete
                    </button>
                  </div>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => {
                      setFaqs(
                        faqs.map((f, i) => (i === idx ? { ...f, question: e.target.value } : f)),
                      );
                    }}
                    placeholder="e.g. Does this support simultaneous charging?"
                    className="h-8 w-full rounded border border-gray-300 px-2 text-xs font-medium"
                  />
                  <textarea
                    rows={2}
                    value={faq.answer}
                    onChange={(e) => {
                      setFaqs(
                        faqs.map((f, i) => (i === idx ? { ...f, answer: e.target.value } : f)),
                      );
                    }}
                    placeholder="Clear and concise answer..."
                    className="w-full rounded border border-gray-300 p-2 text-xs"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 12: SEO */}
      {activeSection === 'seo' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">12. Search Engine Optimization (SEO)</h2>
          <div>
            <label className="block text-xs font-medium text-gray-700">Meta Title</label>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => {
                setSeoTitle(e.target.value);
                if (fieldErrors['seo.title'] || fieldErrors.seoTitle) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next['seo.title'];
                    delete next.seoTitle;
                    return next;
                  });
                }
              }}
              placeholder="Leave blank to use product title"
              className={`mt-1 h-10 w-full rounded-md border px-3 text-sm ${
                fieldErrors['seo.title'] || fieldErrors.seoTitle
                  ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500'
                  : 'border-gray-300'
              }`}
            />
            {(fieldErrors['seo.title'] || fieldErrors.seoTitle) && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {fieldErrors['seo.title'] || fieldErrors.seoTitle}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Meta Description</label>
            <textarea
              rows={3}
              value={seoDescription}
              onChange={(e) => {
                setSeoDescription(e.target.value);
                if (fieldErrors['seo.description'] || fieldErrors.seoDescription) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next['seo.description'];
                    delete next.seoDescription;
                    return next;
                  });
                }
              }}
              placeholder="Leave blank to use short description"
              className={`mt-1 w-full rounded-md border p-3 text-sm ${
                fieldErrors['seo.description'] || fieldErrors.seoDescription
                  ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500'
                  : 'border-gray-300'
              }`}
            />
            {(fieldErrors['seo.description'] || fieldErrors.seoDescription) && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {fieldErrors['seo.description'] || fieldErrors.seoDescription}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Keywords (Comma separated)</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => {
                setKeywords(e.target.value);
                if (fieldErrors['seo.keywords'] || fieldErrors.keywords) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next['seo.keywords'];
                    delete next.keywords;
                    return next;
                  });
                }
              }}
              placeholder="power bank, magsafe, qi2, fast charging"
              className={`mt-1 h-10 w-full rounded-md border px-3 text-sm ${
                fieldErrors['seo.keywords'] || fieldErrors.keywords
                  ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500'
                  : 'border-gray-300'
              }`}
            />
            {(fieldErrors['seo.keywords'] || fieldErrors.keywords) && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {fieldErrors['seo.keywords'] || fieldErrors.keywords}
              </p>
            )}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-800">
              Customer Rating &amp; Reviews (Google Star Snippets)
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Set verified average rating and review counts to show golden stars in Google Search results and Google Shopping.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">Average Rating (1.0 to 5.0)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={ratingAverage}
                  onChange={(e) => setRatingAverage(e.target.value)}
                  placeholder="e.g. 4.8"
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Total Review Count</label>
                <input
                  type="number"
                  min="0"
                  value={ratingCount}
                  onChange={(e) => setRatingCount(e.target.value)}
                  placeholder="e.g. 142"
                  className="mt-1 h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
