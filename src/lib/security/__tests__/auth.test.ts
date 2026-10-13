import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Authentication tests. The Firebase Admin SDK is mocked so we can assert the
 * server-side verification behavior without live credentials:
 *  - missing credential            -> unauthenticated
 *  - expired token                 -> token_expired
 *  - invalid/forged token          -> token_invalid
 *  - role/permissions come ONLY from verified claims, never the request body.
 */
const verifyIdToken = vi.fn();

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: () => ({ verifyIdToken, verifySessionCookie: vi.fn() }),
}));

import { authenticate, authenticateOptional } from '@/lib/security/auth';
import { AppError } from '@/lib/security/errors';

function req(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://example.test/api/x', { headers });
}

beforeEach(() => {
  verifyIdToken.mockReset();
});

describe('authenticate', () => {
  it('rejects requests with no credential', async () => {
    await expect(authenticate(req())).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('maps expired tokens to token_expired', async () => {
    verifyIdToken.mockRejectedValueOnce({ code: 'auth/id-token-expired' });
    await expect(
      authenticate(req({ authorization: 'Bearer abc' })),
    ).rejects.toMatchObject({ code: 'token_expired' });
  });

  it('maps forged/invalid tokens to token_invalid', async () => {
    verifyIdToken.mockRejectedValueOnce({ code: 'auth/argument-error' });
    await expect(
      authenticate(req({ authorization: 'Bearer forged' })),
    ).rejects.toMatchObject({ code: 'token_invalid' });
  });

  it('derives role from verified claims, defaulting untrusted values to customer', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.com', role: 'hacker' });
    const p = await authenticate(req({ authorization: 'Bearer ok' }));
    expect(p.uid).toBe('u1');
    expect(p.role).toBe('customer'); // unknown claim value is NOT trusted as admin
  });

  it('honors a legitimate admin claim', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'admin1', role: 'admin' });
    const p = await authenticate(req({ authorization: 'Bearer ok' }));
    expect(p.role).toBe('admin');
  });
});

describe('authenticateOptional', () => {
  it('returns a guest when no credential is present', async () => {
    const p = await authenticateOptional(req());
    expect(p.uid).toBeNull();
    expect(p.role).toBe('guest');
  });
});

// Ensure AppError is the thrown type (safe error contract).
it('throws AppError instances', async () => {
  await expect(authenticate(req())).rejects.toBeInstanceOf(AppError);
});
