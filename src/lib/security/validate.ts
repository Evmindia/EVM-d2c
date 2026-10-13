/**
 * Input validation + safe request parsing.
 *
 * - Enforces a maximum body size BEFORE parsing (defense against oversized
 *   payloads / memory abuse).
 * - Parses JSON defensively (malformed JSON -> safe 400, never a stack trace).
 * - Validates against a strict Zod schema; unknown keys should be rejected by
 *   using `.strict()` object schemas at call sites.
 */
import type { NextRequest } from 'next/server';
import { z, type ZodType } from 'zod';
import { AppError } from '@/lib/security/errors';

/** Default maximum JSON body size (bytes). Upload routes use their own limits. */
export const DEFAULT_MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_';
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}

/** Validate an already-parsed value against a schema. Throws `validation_error`. */
export function validate<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError('validation_error', { fields: fieldErrors(result.error) });
  }
  return result.data;
}

/**
 * Read + size-check + JSON-parse + validate a request body in one call.
 * Throws safe AppErrors for oversized (`payload_too_large`), malformed
 * (`bad_request`), or invalid (`validation_error`) input.
 */
export async function parseJsonBody<T>(
  req: NextRequest,
  schema: ZodType<T>,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<T> {
  const declaredLength = Number(req.headers.get('content-length') ?? '0');
  if (declaredLength > maxBytes) {
    throw new AppError('payload_too_large');
  }

  const raw = await req.text();
  if (raw.length > maxBytes) {
    throw new AppError('payload_too_large');
  }

  let parsed: unknown;
  try {
    parsed = raw.length ? JSON.parse(raw) : {};
  } catch {
    throw new AppError('bad_request', { internal: 'malformed JSON body' });
  }

  return validate(schema, parsed);
}

/** Validate query params from a URL against a schema. */
export function parseQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  return validate(schema, params);
}

// ---- Reusable primitives for user-generated content ------------------------
/**
 * Detect ASCII control characters (U+0000-U+001F and U+007F). Used to reject
 * malicious/garbage input in stored free text. A codepoint scan is used instead
 * of a regex literal so no control bytes are embedded in source.
 */
export function hasControlChars(v: string): boolean {
  for (let i = 0; i < v.length; i++) {
    const code = v.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/** Bounded, trimmed free text (names, subjects). Rejects control chars. */
export const safeText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((v) => !hasControlChars(v), 'contains control characters');

/** Pagination with a hard cap to prevent unbounded queries. */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
});
