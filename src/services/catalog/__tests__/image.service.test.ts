import { describe, it, expect } from 'vitest';
import {
  sniffImageType,
  validateImageUpload,
  MAX_IMAGE_BYTES,
} from '@/services/catalog/image.service';
import { AppError } from '@/lib/security/errors';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]); // "MZ" PE header

describe('magic-byte sniffing', () => {
  it('recognizes real image signatures', () => {
    expect(sniffImageType(JPEG)).toBe('image/jpeg');
    expect(sniffImageType(PNG)).toBe('image/png');
    expect(sniffImageType(WEBP)).toBe('image/webp');
  });

  it('rejects non-images (e.g. executables)', () => {
    expect(sniffImageType(EXE)).toBeNull();
  });
});

describe('validateImageUpload', () => {
  it('accepts a valid jpeg and returns a generated (non-client) path', () => {
    const r = validateImageUpload('prod123', {
      declaredType: 'image/jpeg',
      sizeBytes: 1000,
      headerBytes: JPEG,
    });
    expect(r.type).toBe('image/jpeg');
    expect(r.storagePath).toMatch(/^products\/prod123\/[0-9a-f-]+\.jpg$/);
  });

  it('rejects disguised uploads (declared jpeg but bytes are an exe)', () => {
    expect(() =>
      validateImageUpload('p1', { declaredType: 'image/jpeg', sizeBytes: 1000, headerBytes: EXE }),
    ).toThrowError(AppError);
  });

  it('rejects declared/real type mismatch (png bytes declared as jpeg)', () => {
    expect(() =>
      validateImageUpload('p1', { declaredType: 'image/jpeg', sizeBytes: 1000, headerBytes: PNG }),
    ).toThrowError(AppError);
  });

  it('rejects unsupported declared type', () => {
    expect(() =>
      validateImageUpload('p1', {
        declaredType: 'image/svg+xml',
        sizeBytes: 100,
        headerBytes: JPEG,
      }),
    ).toThrowError(AppError);
  });

  it('rejects oversized and zero-size files', () => {
    expect(() =>
      validateImageUpload('p1', {
        declaredType: 'image/png',
        sizeBytes: MAX_IMAGE_BYTES + 1,
        headerBytes: PNG,
      }),
    ).toThrowError(AppError);
    expect(() =>
      validateImageUpload('p1', { declaredType: 'image/png', sizeBytes: 0, headerBytes: PNG }),
    ).toThrowError(AppError);
  });
});
