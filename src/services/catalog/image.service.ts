import 'server-only';

/**
 * Product image handling foundation (admin-only).
 *
 * Validates uploads defensively before they are accepted:
 *  - content-type allow-list (images only)
 *  - MAGIC-BYTE sniffing (the declared type must match real file bytes)
 *  - maximum size
 *  - generated, sanitized storage filenames (never the client filename)
 *  - refuses anything that isn't a known image (no executables)
 *
 * Actual Storage upload wiring uses these primitives. No real product images are
 * created here — EVM supplies assets later.
 */
import { randomUUID } from 'node:crypto';
import { AppError } from '@/lib/security/errors';
import { adminStorage, adminStorageBucketName } from '@/lib/firebase/admin';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25 MB

const EXT_FOR_TYPE: Record<AllowedImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Sniff the real image type from magic bytes. Returns null if unrecognized. */
export function sniffImageType(bytes: Uint8Array): AllowedImageType | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  // WEBP: "RIFF"...."WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export interface ImageUploadRequest {
  declaredType: string;
  sizeBytes: number;
  /** First bytes of the file for magic-byte validation (>= 12 bytes). */
  headerBytes: Uint8Array;
}

export interface ValidatedImage {
  type: AllowedImageType;
  /** Safe, generated object path — never derived from the client filename. */
  storagePath: string;
}

/**
 * Validate an image upload request. Throws safe AppErrors on any violation.
 * `productId` scopes the storage path; it must be a validated id.
 */
export function validateImageUpload(
  productId: string,
  req: ImageUploadRequest,
): ValidatedImage {
  if (!ALLOWED_IMAGE_TYPES.includes(req.declaredType as AllowedImageType)) {
    throw new AppError('validation_error', { fields: { type: 'unsupported image type' } });
  }
  if (req.sizeBytes <= 0 || req.sizeBytes > MAX_IMAGE_BYTES) {
    throw new AppError('payload_too_large', { internal: `image size ${req.sizeBytes}` });
  }
  const sniffed = sniffImageType(req.headerBytes);
  if (!sniffed) {
    throw new AppError('validation_error', { fields: { file: 'not a recognized image' } });
  }
  if (sniffed !== req.declaredType) {
    // Declared type must match the real bytes (defeats disguised uploads).
    throw new AppError('validation_error', { fields: { file: 'content does not match type' } });
  }
  const ext = EXT_FOR_TYPE[sniffed];
  const storagePath = `products/${productId}/${randomUUID()}.${ext}`;
  return { type: sniffed, storagePath };
}

/**
 * Upload an image to Firebase Storage with full validation.
 * Returns a permanent Firebase Storage public download URL.
 */
export async function uploadProductImage(
  productId: string,
  fileBytes: Buffer | Uint8Array,
  declaredType: string,
): Promise<{ url: string; storagePath: string; type: AllowedImageType }> {
  const headerBytes = fileBytes.slice(0, 16);
  const validated = validateImageUpload(productId, {
    declaredType,
    sizeBytes: fileBytes.length,
    headerBytes,
  });

  const bucketName = adminStorageBucketName();
  const bucket = adminStorage().bucket(bucketName);
  const file = bucket.file(validated.storagePath);
  const downloadToken = randomUUID();

  await file.save(Buffer.from(fileBytes), {
    contentType: validated.type,
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const encodedPath = encodeURIComponent(validated.storagePath);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;

  return { url, storagePath: validated.storagePath, type: validated.type };
}
