import 'server-only';

import type { Firestore, DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

export interface ProductTag {
  name: string;
  image: string;
  price: number;
  mrp: number;
  discount: string;
  href: string;
}

export interface BrandReel {
  id: string;
  title: string;
  handle: string;
  views: string;
  likes: number;
  shares: number;
  poster: string;
  videoUrl?: string;
  product: ProductTag;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BrandReelInput = Omit<BrandReel, 'id' | 'createdAt' | 'updatedAt'>;

const COLLECTION = 'brand_reels';

export const DEFAULT_BRAND_REELS: BrandReel[] = [
  {
    id: 'reel-powerbank-1',
    title: 'Snap. Charge. Go. The ultimate MagSafe carry ⚡',
    handle: '@evmzone • Daily Carry',
    views: '38.4K',
    likes: 1420,
    shares: 312,
    poster: '/cat-powerbank.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    product: {
      name: 'Encase 10,000mAh MagSafe Power Bank',
      image: '/cat-powerbank.jpg',
      price: 1499,
      mrp: 2999,
      discount: '50% OFF',
      href: '/products',
    },
    sortOrder: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'reel-headphone-1',
    title: 'Deep bass, zero distraction. 50H battery beast 🎧',
    handle: '@evmzone • Audio Lab',
    views: '52.1K',
    likes: 2890,
    shares: 540,
    poster: '/cat-headphone.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    product: {
      name: 'Wave Wireless ANC Over-Ear Headphones',
      image: '/cat-headphone.jpg',
      price: 2499,
      mrp: 4999,
      discount: '50% OFF',
      href: '/products',
    },
    sortOrder: 2,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'reel-earphone-1',
    title: 'Pocket-sized audio bliss for daily city commutes 🎶',
    handle: '@evmzone • Commute Sound',
    views: '27.8K',
    likes: 980,
    shares: 165,
    poster: '/cat-earphone.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    product: {
      name: 'AirRhythm True Wireless Earphones',
      image: '/cat-earphone.jpg',
      price: 999,
      mrp: 1999,
      discount: '50% OFF',
      href: '/products',
    },
    sortOrder: 3,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'reel-charger-1',
    title: 'One brick to charge MacBook, phone & buds at once 🔌',
    handle: '@evmzone • Travel Tech',
    views: '61.3K',
    likes: 3450,
    shares: 620,
    poster: '/moment-work.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    product: {
      name: 'ChargeFast 65W Dual Type-C GaN Charger',
      image: '/moment-work.jpg',
      price: 1799,
      mrp: 3499,
      discount: '49% OFF',
      href: '/products',
    },
    sortOrder: 4,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'reel-slim-1',
    title: 'Super thin, featherlight. Fits in any jeans pocket 🔋',
    handle: '@evmzone • Lifestyle',
    views: '19.6K',
    likes: 750,
    shares: 124,
    poster: '/moment-everyday.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    product: {
      name: 'MagPack Ultra-Slim 5,000mAh Battery',
      image: '/moment-everyday.jpg',
      price: 1199,
      mrp: 2299,
      discount: '48% OFF',
      href: '/products',
    },
    sortOrder: 5,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'reel-commute-1',
    title: 'Block the train noise, feel every beat. Pure freedom 🚆',
    handle: '@evmzone • City Life',
    views: '44.9K',
    likes: 1830,
    shares: 290,
    poster: '/moment-commute.jpg',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    product: {
      name: 'Commute Pro Wireless Headset',
      image: '/moment-commute.jpg',
      price: 2199,
      mrp: 3999,
      discount: '45% OFF',
      href: '/products',
    },
    sortOrder: 6,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

function docToReel(id: string, d: DocumentData): BrandReel {
  return {
    id,
    title: String(d.title ?? ''),
    handle: String(d.handle ?? '@evmzone'),
    views: String(d.views ?? '10K'),
    likes: typeof d.likes === 'number' ? d.likes : 0,
    shares: typeof d.shares === 'number' ? d.shares : 0,
    poster: String(d.poster ?? '/cat-powerbank.jpg'),
    videoUrl: d.videoUrl ? String(d.videoUrl) : undefined,
    product: {
      name: String(d.product?.name ?? 'EVM Essential'),
      image: String(d.product?.image ?? '/cat-powerbank.jpg'),
      price: typeof d.product?.price === 'number' ? d.product.price : 999,
      mrp: typeof d.product?.mrp === 'number' ? d.product.mrp : 1999,
      discount: String(d.product?.discount ?? '50% OFF'),
      href: String(d.product?.href ?? '/products'),
    },
    sortOrder: typeof d.sortOrder === 'number' ? d.sortOrder : 0,
    isActive: d.isActive !== false,
    createdAt: d.createdAt ? String(d.createdAt) : new Date().toISOString(),
    updatedAt: d.updatedAt ? String(d.updatedAt) : new Date().toISOString(),
  };
}

function db(): Firestore | null {
  try {
    return adminDb();
  } catch (err) {
    logger.warn('reels_db_unavailable', { err: String(err) });
    return null;
  }
}

/**
 * Public listing of active reels for the storefront.
 * If database is not populated or offline, seamlessly falls back to default reels.
 */
export async function listPublicReels(): Promise<BrandReel[]> {
  const database = db();
  if (!database) return DEFAULT_BRAND_REELS;

  try {
    const snap = await database
      .collection(COLLECTION)
      .where('isActive', '==', true)
      .get();

    if (snap.empty) {
      return DEFAULT_BRAND_REELS;
    }

    const reels = snap.docs.map((d) => docToReel(d.id, d.data()));
    reels.sort((a, b) => a.sortOrder - b.sortOrder);
    return reels;
  } catch (err) {
    logger.warn('listPublicReels_failed', { err: String(err) });
    return DEFAULT_BRAND_REELS;
  }
}

/**
 * Admin listing of all reels (active & inactive) with sorting.
 */
export async function adminListReels(): Promise<BrandReel[]> {
  const database = db();
  if (!database) return DEFAULT_BRAND_REELS;

  try {
    const snap = await database.collection(COLLECTION).orderBy('sortOrder', 'asc').get();

    if (snap.empty) {
      // Seed default reels so admin has immediate records to edit
      await Promise.all(
        DEFAULT_BRAND_REELS.map(async (reel) => {
          const { id, ...data } = reel;
          await database.collection(COLLECTION).doc(id).set(data);
        })
      );
      return DEFAULT_BRAND_REELS;
    }

    return snap.docs.map((doc) => docToReel(doc.id, doc.data()));
  } catch (err) {
    logger.warn('adminListReels_failed', { err: String(err) });
    return DEFAULT_BRAND_REELS;
  }
}

/**
 * Create a new brand reel document.
 */
export async function createReel(input: Partial<BrandReelInput>): Promise<BrandReel> {
  const database = db();
  if (!database) {
    throw new Error('Database is unconfigured');
  }

  const now = new Date().toISOString();
  const data: Omit<BrandReel, 'id'> = {
    title: input.title || 'New EVM Reel',
    handle: input.handle || '@evmzone',
    views: input.views || '10.5K',
    likes: typeof input.likes === 'number' ? input.likes : 120,
    shares: typeof input.shares === 'number' ? input.shares : 35,
    poster: input.poster || '/cat-powerbank.jpg',
    videoUrl: input.videoUrl || '',
    product: {
      name: input.product?.name || 'EVM Product',
      image: input.product?.image || '/cat-powerbank.jpg',
      price: input.product?.price || 1499,
      mrp: input.product?.mrp || 2999,
      discount: input.product?.discount || '50% OFF',
      href: input.product?.href || '/products',
    },
    sortOrder: typeof input.sortOrder === 'number' ? input.sortOrder : 0,
    isActive: input.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await database.collection(COLLECTION).add(data);
  return { id: ref.id, ...data };
}

/**
 * Update an existing brand reel.
 */
export async function updateReel(id: string, updates: Partial<BrandReelInput>): Promise<BrandReel | null> {
  const database = db();
  if (!database) {
    throw new Error('Database is unconfigured');
  }

  const docRef = database.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    return null;
  }

  const now = new Date().toISOString();
  const cleanUpdates = { ...updates, updatedAt: now };
  await docRef.update(cleanUpdates);

  const updatedDoc = await docRef.get();
  return docToReel(updatedDoc.id, updatedDoc.data()!);
}

/**
 * Delete a brand reel.
 */
export async function deleteReel(id: string): Promise<boolean> {
  const database = db();
  if (!database) {
    throw new Error('Database is unconfigured');
  }

  await database.collection(COLLECTION).doc(id).delete();
  return true;
}
