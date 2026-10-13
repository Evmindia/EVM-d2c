import { describe, it, expect } from 'vitest';
import { AppError, toSafeErrorBody, statusForCode, errorResponse } from '@/lib/security/errors';

describe('safe error handling', () => {
  it('maps codes to correct HTTP statuses', () => {
    expect(statusForCode('unauthenticated')).toBe(401);
    expect(statusForCode('forbidden')).toBe(403);
    expect(statusForCode('rate_limited')).toBe(429);
    expect(statusForCode('payload_too_large')).toBe(413);
    expect(statusForCode('internal_error')).toBe(500);
  });

  it('never leaks internal detail in the serialized body', () => {
    const err = new AppError('internal_error', {
      internal: { secret: 'db://user:pass@host', stack: 'at foo (/srv/app.ts:1)' },
    });
    const body = toSafeErrorBody(err, 'req-123');
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('db://');
    expect(serialized).not.toContain('/srv/app.ts');
    expect(body.error.code).toBe('internal_error');
    expect(body.error.requestId).toBe('req-123');
  });

  it('collapses unknown thrown values into a generic 500', async () => {
    const res = errorResponse(new Error('raw boom with /paths and secrets'), 'req-9');
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe('internal_error');
    expect(json.error.message).not.toContain('boom');
  });
});
