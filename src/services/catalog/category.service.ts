import 'server-only';

/**
 * Category service. Public reads return active categories (mapped to public
 * DTO). Writes are admin-only via the API layer.
 */
import type { DocumentData } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { AppError } from '@/lib/security/errors';
import { toPublicCategory } from './catalog.mappers';
import type { Category, PublicCategory } from '@/types/catalog';
import type { CategoryCreateInput } from '@/lib/validation/catalog';

const COLLECTION = 'categories';

function docToCategory(id: string, d: DocumentData): Category {
  return {
    id,
    name: String(d.name ?? ''),
    slug: String(d.slug ?? ''),
    description: String(d.description ?? ''),
    image: d.image ?? null,
    sortOrder: typeof d.sortOrder === 'number' ? d.sortOrder : 0,
    isActive: Boolean(d.isActive),
    seo: d.seo ?? {},
    createdAt: String(d.createdAt ?? ''),
    updatedAt: String(d.updatedAt ?? ''),
  };
}

export async function listPublicCategories(): Promise<PublicCategory[]> {
  const snap = await adminDb()
    .collection(COLLECTION)
    .where('isActive', '==', true)
    .orderBy('sortOrder', 'asc')
    .limit(200)
    .get();
  return snap.docs.map((d) => toPublicCategory(docToCategory(d.id, d.data())));
}

export async function adminListCategories(): Promise<Category[]> {
  const snap = await adminDb().collection(COLLECTION).orderBy('sortOrder', 'asc').limit(200).get();
  return snap.docs.map((d) => docToCategory(d.id, d.data()));
}

export async function createCategory(input: CategoryCreateInput): Promise<Category> {
  const dup = await adminDb().collection(COLLECTION).where('slug', '==', input.slug).limit(1).get();
  if (!dup.empty) throw new AppError('conflict', { internal: `category slug exists: ${input.slug}` });
  const now = new Date().toISOString();
  const data = { ...input, createdAt: now, updatedAt: now };
  const ref = await adminDb().collection(COLLECTION).add(data);
  return docToCategory(ref.id, data);
}

export async function adminGetCategory(id: string): Promise<Category | null> {
  const snap = await adminDb().collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return docToCategory(id, snap.data()!);
}

/** Update a category (name/description/image/sortOrder/isActive/seo). Slug
 * changes re-checked for uniqueness. */
export async function updateCategory(
  id: string,
  input: Partial<CategoryCreateInput>,
): Promise<Category> {
  const existing = await adminGetCategory(id);
  if (!existing) throw new AppError('not_found');
  if (input.slug && input.slug !== existing.slug) {
    const dup = await adminDb().collection(COLLECTION).where('slug', '==', input.slug).limit(1).get();
    if (!dup.empty && dup.docs[0]!.id !== id) {
      throw new AppError('conflict', { internal: `category slug exists: ${input.slug}` });
    }
  }
  await adminDb()
    .collection(COLLECTION)
    .doc(id)
    .set({ ...input, updatedAt: new Date().toISOString() }, { merge: true });
  return (await adminGetCategory(id))!;
}
