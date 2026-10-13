import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { AppError } from '@/lib/security/errors';

function req(headers: Record<string, string>): NextRequest {
  return new NextRequest('https://shop.example/api/x', { method: 'POST', headers });
}

describe('CSRF same-origin check', () => {
  it('allows a same-origin request (Origin host matches)', () => {
    expect(() => assertSameOrigin(req({ origin: 'https://shop.example', host: 'shop.example' }))).not.toThrow();
  });

  it('blocks a cross-origin request (Origin host mismatch)', () => {
    expect(() =>
      assertSameOrigin(req({ origin: 'https://evil.example', host: 'shop.example' })),
    ).toThrowError(AppError);
  });

  it('falls back to Referer when Origin is absent', () => {
    expect(() =>
      assertSameOrigin(req({ referer: 'https://evil.example/x', host: 'shop.example' })),
    ).toThrowError(AppError);
    expect(() =>
      assertSameOrigin(req({ referer: 'https://shop.example/x', host: 'shop.example' })),
    ).not.toThrow();
  });

  it('allows non-browser requests with no Origin/Referer (not cookie-CSRF-exposed)', () => {
    expect(() => assertSameOrigin(req({ host: 'shop.example' }))).not.toThrow();
  });

  it('honors x-forwarded-host (behind a proxy/CDN)', () => {
    expect(() =>
      assertSameOrigin(req({ origin: 'https://shop.example', 'x-forwarded-host': 'shop.example', host: 'internal' })),
    ).not.toThrow();
  });
});
