// @ts-nocheck
/* eslint-disable */
/**
 * Emulator tests for cart security rules (OPT-IN).
 *
 * Carts are server-only: clients must NOT be able to read or write ANY cart
 * document directly, even their own — all cart access goes through the Admin SDK
 * via the /api/cart endpoints (ownership enforced in the service by verified uid
 * / secure guest cookie). These tests assert the DB-level deny.
 *
 * Run with the Firestore emulator + @firebase/rules-unit-testing installed:
 *   RUN_EMULATOR_TESTS=1 firebase emulators:exec "vitest run **/*.emulator.test.ts"
 *
 * Excluded from typecheck/lint and from the default `npm test` run so the
 * standard gates stay green without the emulator.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'evm-cart-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

describe('cart documents are server-only (deny all client access)', () => {
  it('an authenticated user cannot READ any cart document directly', async () => {
    const ctx = env.authenticatedContext('userA');
    const db = ctx.firestore();
    await assertFails(getDoc(doc(db, 'carts/u_userA')));
    await assertFails(getDoc(doc(db, 'carts/u_userB'))); // and definitely not others
  });

  it('an authenticated user cannot WRITE any cart document directly', async () => {
    const ctx = env.authenticatedContext('userA');
    const db = ctx.firestore();
    await assertFails(setDoc(doc(db, 'carts/u_userA'), { items: [] }));
  });

  it('an anonymous/guest client cannot read or write carts', async () => {
    const ctx = env.unauthenticatedContext();
    const db = ctx.firestore();
    await assertFails(getDoc(doc(db, 'carts/g_anything')));
    await assertFails(setDoc(doc(db, 'carts/g_anything'), { items: [] }));
  });
});
