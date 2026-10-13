import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validate, safeText, hasControlChars, paginationSchema } from '@/lib/security/validate';
import { AppError } from '@/lib/security/errors';

describe('input validation', () => {
  it('rejects unknown keys with strict schemas', () => {
    const schema = z.object({ name: z.string() }).strict();
    expect(() => validate(schema, { name: 'ok', evil: 1 })).toThrowError(AppError);
  });

  it('surfaces field-level errors without leaking internals', () => {
    const schema = z.object({ qty: z.number().int().min(1) });
    try {
      validate(schema, { qty: 0 });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe('validation_error');
      expect((err as AppError).fields).toHaveProperty('qty');
    }
  });

  it('safeText rejects control characters (injection hygiene)', () => {
    const withNull = `bad${String.fromCharCode(0)}value`;
    const withBell = `x${String.fromCharCode(7)}y`;
    expect(hasControlChars('hello')).toBe(false);
    expect(hasControlChars(withNull)).toBe(true);
    expect(() => validate(safeText(20), 'clean name')).not.toThrow();
    expect(() => validate(safeText(20), withBell)).toThrowError(AppError);
  });

  it('caps pagination to prevent unbounded queries', () => {
    expect(() => validate(paginationSchema, { limit: 999 })).toThrowError(AppError);
    expect(validate(paginationSchema, {}).limit).toBe(20);
    expect(validate(paginationSchema, { limit: 50 }).limit).toBe(50);
  });
});
