import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import {
  getDraftStorageKey,
  saveProductDraft,
  loadProductDraft,
  clearProductDraft,
  getSectionForField,
  formatFieldLabel,
  DRAFT_STORAGE_KEY_NEW,
  type ProductDraftData,
} from '../ProductEditor';

class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe('ProductEditor Draft / Auto-save Logic', () => {
  const sampleDraft: Omit<ProductDraftData, 'savedAt'> = {
    title: 'EVM Encase Pro Earbuds',
    slug: 'evm-encase-pro-earbuds',
    sku: 'EVM-ENC-01',
    brand: 'EVM',
    categoryId: 'cat_audio_123',
    shortDescription: 'High fidelity wireless ANC earbuds',
    description: 'Detailed story and specs for EVM Encase Pro earbuds...',
    isActive: true,
    stockStatus: 'in_stock',
    priceRupees: '1999',
    mrpRupees: '3999',
    hsn: '85183090',
    gstRate: '18',
    images: [{ url: 'https://storage.googleapis.com/evm/earbuds.webp', alt: 'EVM Encase Pro Front' }],
    thumbnailUrl: 'https://storage.googleapis.com/evm/earbuds.webp',
    variants: [{ id: 'var_1', type: 'color', label: 'Color', value: '#000000', inStock: true }],
    storySections: [{ heading: 'Sound Engineering', description: 'Crafted with precision.' }],
    features: ['Active Noise Cancellation', '36hr Battery Life'],
    featureBlocks: [{ title: 'ANC 35dB', description: 'Silence the noise.' }],
    specifications: [{ group: 'Audio', items: [{ label: 'Driver', value: '13mm' }] }],
    compatibility: ['iOS', 'Android', 'Windows', 'macOS'],
    whatsInTheBox: ['Earbuds', 'Charging Case', 'Type-C Cable'],
    warranty: '1 Year Brand Warranty',
    faqs: [{ question: 'Is it waterproof?', answer: 'IPX5 water resistant.' }],
    seoTitle: 'Buy EVM Encase Pro Earbuds Online',
    seoDescription: 'Premium ANC wireless earbuds from EVM.',
    keywords: 'earbuds, wireless, anc, evm',
  };

  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    // Setup window & localStorage on globalThis for Node test environment
    (globalThis as unknown as { window: { localStorage: MockStorage } }).window = {
      localStorage: mockStorage,
    };
    vi.restoreAllMocks();
  });

  afterAll(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  describe('Storage Key Isolation', () => {
    it('returns standard new draft key in create mode', () => {
      expect(getDraftStorageKey('create')).toBe(DRAFT_STORAGE_KEY_NEW);
      expect(getDraftStorageKey('create', 'prod_123')).toBe(DRAFT_STORAGE_KEY_NEW);
    });

    it('returns isolated edit draft key per product ID in edit mode', () => {
      expect(getDraftStorageKey('edit', 'prod_456')).toBe('evm-product-draft-edit-prod_456');
      expect(getDraftStorageKey('edit', 'prod_789')).toBe('evm-product-draft-edit-prod_789');
    });

    it('ensures create mode and edit mode keys do not collide', () => {
      const createKey = getDraftStorageKey('create');
      const editKey = getDraftStorageKey('edit', 'prod_123');
      expect(createKey).not.toBe(editKey);
    });
  });

  describe('Draft Persistence Lifecycle', () => {
    it('saves draft to localStorage with timestamp', () => {
      const key = getDraftStorageKey('create');
      const saved = saveProductDraft(key, sampleDraft);
      expect(saved).toBe(true);

      const raw = mockStorage.getItem(key);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.title).toBe(sampleDraft.title);
      expect(parsed.priceRupees).toBe('1999');
      expect(parsed.images).toHaveLength(1);
      expect(parsed.savedAt).toBeTypeOf('number');
    });

    it('loads existing draft from localStorage correctly', () => {
      const key = getDraftStorageKey('create');
      saveProductDraft(key, sampleDraft);

      const loaded = loadProductDraft(key);
      expect(loaded).not.toBeNull();
      expect(loaded?.title).toBe('EVM Encase Pro Earbuds');
      expect(loaded?.sku).toBe('EVM-ENC-01');
      expect(loaded?.variants).toHaveLength(1);
      expect(loaded?.faqs).toHaveLength(1);
      expect(loaded?.faqs[0]?.question).toBe('Is it waterproof?');
    });

    it('returns null when draft does not exist', () => {
      const loaded = loadProductDraft('non_existent_key');
      expect(loaded).toBeNull();
    });

    it('returns null when localStorage contains corrupted JSON', () => {
      mockStorage.setItem('corrupted_key', '{ invalid json ...');
      const loaded = loadProductDraft('corrupted_key');
      expect(loaded).toBeNull();
    });

    it('clears draft from localStorage on discard or publish', () => {
      const key = getDraftStorageKey('create');
      saveProductDraft(key, sampleDraft);
      expect(loadProductDraft(key)).not.toBeNull();

      clearProductDraft(key);
      expect(loadProductDraft(key)).toBeNull();
    });
  });

  describe('Edit Mode Isolation & Safety', () => {
    it('maintains independent drafts for different products', () => {
      const keyA = getDraftStorageKey('edit', 'prod_A');
      const keyB = getDraftStorageKey('edit', 'prod_B');

      saveProductDraft(keyA, { ...sampleDraft, title: 'Product A' });
      saveProductDraft(keyB, { ...sampleDraft, title: 'Product B' });

      expect(loadProductDraft(keyA)?.title).toBe('Product A');
      expect(loadProductDraft(keyB)?.title).toBe('Product B');

      clearProductDraft(keyA);
      expect(loadProductDraft(keyA)).toBeNull();
      expect(loadProductDraft(keyB)?.title).toBe('Product B');
    });

    it('does not overwrite new product draft when saving edit draft', () => {
      const newKey = getDraftStorageKey('create');
      const editKey = getDraftStorageKey('edit', 'existing_prod_1');

      saveProductDraft(newKey, { ...sampleDraft, title: 'New Product' });
      saveProductDraft(editKey, { ...sampleDraft, title: 'Existing Product' });

      expect(loadProductDraft(newKey)?.title).toBe('New Product');
      expect(loadProductDraft(editKey)?.title).toBe('Existing Product');
    });
  });

  describe('Error & Quota Handling', () => {
    it('handles localStorage exceptions gracefully without throwing', () => {
      vi.spyOn(mockStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const key = getDraftStorageKey('create');
      const result = saveProductDraft(key, sampleDraft);
      expect(result).toBe(false);
    });

    it('handles localStorage.getItem exceptions gracefully', () => {
      vi.spyOn(mockStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      const loaded = loadProductDraft('some_key');
      expect(loaded).toBeNull();
    });
  });

  describe('Section & Field Mapping for Validation Errors', () => {
    it('maps field names to their respective sections correctly', () => {
      expect(getSectionForField('title')).toBe('basic');
      expect(getSectionForField('sku')).toBe('basic');
      expect(getSectionForField('categoryId')).toBe('basic');
      expect(getSectionForField('images')).toBe('media');
      expect(getSectionForField('images.0.url')).toBe('media');
      expect(getSectionForField('price')).toBe('pricing');
      expect(getSectionForField('mrp')).toBe('pricing');
      expect(getSectionForField('variants')).toBe('variants');
      expect(getSectionForField('variants.0.label')).toBe('variants');
      expect(getSectionForField('stockStatus')).toBe('inventory');
      expect(getSectionForField('hsn')).toBe('tax');
      expect(getSectionForField('gstRate')).toBe('tax');
      expect(getSectionForField('storySections')).toBe('story');
      expect(getSectionForField('features')).toBe('features');
      expect(getSectionForField('specifications')).toBe('specs');
      expect(getSectionForField('compatibility')).toBe('compatibility');
      expect(getSectionForField('faqs')).toBe('faq');
      expect(getSectionForField('seo')).toBe('seo');
      expect(getSectionForField('seo.title')).toBe('seo');
      expect(getSectionForField('seo.keywords')).toBe('seo');
    });

    it('formats field names into human-readable labels', () => {
      expect(formatFieldLabel('title')).toBe('Product Title');
      expect(formatFieldLabel('sku')).toBe('SKU');
      expect(formatFieldLabel('categoryId')).toBe('Category');
      expect(formatFieldLabel('images')).toBe('Product Images');
      expect(formatFieldLabel('seo.title')).toBe('SEO Meta Title');
      expect(formatFieldLabel('seo.keywords')).toBe('SEO Keywords');
    });
  });
});
