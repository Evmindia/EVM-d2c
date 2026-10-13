import 'server-only';

/**
 * Persist a waybill label (base64 PDF from BlueDart) to Firebase Storage. The
 * label is returned only once at creation, so we store it under a server-only
 * path keyed by order number. Returns the storage path (served later via a
 * dedicated admin endpoint / signed URL — not made public here).
 */
import { adminStorage, adminStorageBucketName } from '@/lib/firebase/admin';

export async function saveWaybillLabel(orderNumber: string, base64: string): Promise<string> {
  const clean = base64.replace(/^data:application\/pdf;base64,/, '');
  const buffer = Buffer.from(clean, 'base64');
  const path = `shipping-labels/${orderNumber}.pdf`;
  await adminStorage()
    .bucket(adminStorageBucketName())
    .file(path)
    .save(buffer, { contentType: 'application/pdf', resumable: false });
  return path;
}

/** Download a stored label PDF as a Buffer (server-only; admin-gated by caller). */
export async function readWaybillLabel(path: string): Promise<Buffer> {
  const [buffer] = await adminStorage().bucket(adminStorageBucketName()).file(path).download();
  return buffer;
}
