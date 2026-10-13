import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Cart API authorization / IDOR tests. Firebase Admin is mocked to mint
 * controlled tokens; the cart SERVICE is mocked so we can assert exactly which
 * identity each route resolves — proving identity comes from the verified token
 * (or the secure guest cookie), never from the request body.
 */
const verifyIdToken = vi.fn();
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: () => ({ verifyIdToken, verifySessionCookie: vi.fn() }),
  adminDb: () => ({}),
}));

const getCartView = vi.fn(async () => ({ lines: [], subtotal: 0, itemCount: 0 }));
const addItem = vi.fn(async () => ({ lines: [], subtotal: 0, itemCount: 1 }));
const updateItem = vi.fn(async () => ({ lines: [], subtotal: 0, itemCount: 0 }));
vi.mock('@/services/cart/cart.service', () => ({
  getCartView: (...a: unknown[]) => getCartView(...(a as [])),
  addItem: (...a: unknown[]) => addItem(...(a as [])),
  updateItem: (...a: unknown[]) => updateItem(...(a as [])),
  removeItem: vi.fn(async () => ({ lines: [], subtotal: 0, itemCount: 0 })),
  clearCart: vi.fn(async () => ({ lines: [], subtotal: 0, itemCount: 0 })),
}));

import { GET } from '@/app/api/cart/route';
import { POST } from '@/app/api/cart/items/route';
import { PATCH } from '@/app/api/cart/items/[productId]/route';

const VALID_GUEST_TOKEN = 'a'.repeat(64);

function req(
  url: string,
  opts: { method?: string; body?: unknown; auth?: string; cookie?: string } = {},
): NextRequest {
  const headers: Record<string, string> = {};
  if (opts.auth) headers.authorization = `Bearer ${opts.auth}`;
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.body) headers['content-type'] = 'application/json';
  return new NextRequest(`https://x.test${url}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

beforeEach(() => {
  verifyIdToken.mockReset();
  getCartView.mockClear();
  addItem.mockClear();
  updateItem.mockClear();
});

describe('cart identity is derived from the verified token, not the body', () => {
  it('GET uses the authenticated uid', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'userA', role: 'customer' });
    await GET(req('/api/cart', { auth: 't' }));
    expect(getCartView).toHaveBeenCalledWith({ kind: 'user', uid: 'userA' });
  });

  it('two different users resolve to two different carts (no IDOR)', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'userA', role: 'customer' });
    await GET(req('/api/cart', { auth: 'tA' }));
    verifyIdToken.mockResolvedValueOnce({ uid: 'userB', role: 'customer' });
    await GET(req('/api/cart', { auth: 'tB' }));
    expect(getCartView).toHaveBeenNthCalledWith(1, { kind: 'user', uid: 'userA' });
    expect(getCartView).toHaveBeenNthCalledWith(2, { kind: 'user', uid: 'userB' });
  });

  it('a body-supplied userId is ignored (strict schema rejects it → 422)', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'userA', role: 'customer' });
    const res = await POST(
      req('/api/cart/items', {
        method: 'POST',
        auth: 't',
        body: { productId: 'p1', quantity: 1, userId: 'victim' },
      }),
    );
    expect(res.status).toBe(422);
    expect(addItem).not.toHaveBeenCalled();
  });

  it('add uses the authenticated uid, not anything from the body', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'userA', role: 'customer' });
    await POST(req('/api/cart/items', { method: 'POST', auth: 't', body: { productId: 'p1', quantity: 2 } }));
    expect(addItem).toHaveBeenCalledWith({ kind: 'user', uid: 'userA' }, 'p1', 2);
  });
});

describe('guest cart isolation', () => {
  it('GET with no auth and no cookie returns an empty cart (no service call)', async () => {
    const res = await GET(req('/api/cart'));
    expect(res.status).toBe(200);
    expect(getCartView).not.toHaveBeenCalled();
  });

  it('GET with a guest cookie resolves that guest token', async () => {
    await GET(req('/api/cart', { cookie: `evm_cart=${VALID_GUEST_TOKEN}` }));
    expect(getCartView).toHaveBeenCalledWith({ kind: 'guest', token: VALID_GUEST_TOKEN });
  });

  it('ignores a tampered/garbage guest cookie (mints a fresh one instead)', async () => {
    // A malformed cookie must not be used as an identity.
    await GET(req('/api/cart', { cookie: 'evm_cart=not-a-valid-token' }));
    expect(getCartView).not.toHaveBeenCalled(); // read does not create → empty view
  });
});

describe('cart mutation validation (price/quantity manipulation)', () => {
  it('rejects an injected price/subtotal in the add body (422)', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'userA', role: 'customer' });
    const res = await POST(
      req('/api/cart/items', {
        method: 'POST',
        auth: 't',
        body: { productId: 'p1', quantity: 1, price: 1, subtotal: 0, total: 0 },
      }),
    );
    expect(res.status).toBe(422);
    expect(addItem).not.toHaveBeenCalled();
  });

  it('rejects negative quantity (422)', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'userA', role: 'customer' });
    const res = await POST(
      req('/api/cart/items', { method: 'POST', auth: 't', body: { productId: 'p1', quantity: -5 } }),
    );
    expect(res.status).toBe(422);
  });

  it('rejects an extremely large quantity (422)', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'userA', role: 'customer' });
    const res = await POST(
      req('/api/cart/items', {
        method: 'POST',
        auth: 't',
        body: { productId: 'p1', quantity: 1000000 },
      }),
    );
    expect(res.status).toBe(422);
  });

  it('rejects a malformed productId in the PATCH path (422)', async () => {
    const res = await PATCH(
      req('/api/cart/items/..%2Fsecret', { method: 'PATCH', cookie: `evm_cart=${VALID_GUEST_TOKEN}`, body: { quantity: 1 } }),
    );
    expect(res.status).toBe(422);
    expect(updateItem).not.toHaveBeenCalled();
  });
});
