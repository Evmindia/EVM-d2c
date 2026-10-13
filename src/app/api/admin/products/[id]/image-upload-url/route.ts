import { route, ok } from '@/app/api/_lib/handler';
import { requirePermission } from '@/lib/auth/require-permission';
import { parseJsonBody, validate } from '@/lib/security/validate';
import { AppError } from '@/lib/security/errors';
import { z } from 'zod';
import { docIdSchema } from '@/lib/validation/catalog';
import {
  validateImageUpload,
  uploadProductImage,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from '@/services/catalog/image.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/products/[id]/image-upload-url — Image upload endpoint.
 *
 * Accepts either:
 *  1) multipart/form-data with `file`: uploads directly to Firebase Storage with
 *     magic-byte validation and returns a permanent public download URL.
 *  2) JSON (declaredType, sizeBytes, headerBase64): validates header bytes and returns storagePath.
 */
const bodySchema = z
  .object({
    declaredType: z.enum(ALLOWED_IMAGE_TYPES),
    sizeBytes: z.number().int().positive().max(MAX_IMAGE_BYTES),
    // Base64 of the first >=12 bytes of the file, for magic-byte validation.
    headerBase64: z.string().min(16).max(64),
  })
  .strict();

export const POST = route(
  async ({ req }) => {
    await requirePermission(req, 'products:write');
    const id = validate(docIdSchema, req.nextUrl.pathname.split('/').filter(Boolean).at(-2));
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file || typeof file === 'string') {
        throw new AppError('validation_error', { fields: { file: 'file is required' } });
      }
      const buffer = Buffer.from(await (file as File).arrayBuffer());
      const uploaded = await uploadProductImage(id, buffer, (file as File).type);
      return ok({ url: uploaded.url, storagePath: uploaded.storagePath, type: uploaded.type });
    }

    const body = await parseJsonBody(req, bodySchema, MAX_IMAGE_BYTES);
    const headerBytes = new Uint8Array(Buffer.from(body.headerBase64, 'base64'));
    const validated = validateImageUpload(id, {
      declaredType: body.declaredType,
      sizeBytes: body.sizeBytes,
      headerBytes,
    });
    return ok({ storagePath: validated.storagePath, type: validated.type });
  },
  { rateLimit: 'admin_write', sameOrigin: true },
);
