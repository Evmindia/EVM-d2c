// @ts-nocheck
/* eslint-disable */
/**
 * Emulator tests for Phase 5 user/address rules (OPT-IN).
 *
 *  users/{uid}       : a user may READ only their own profile; ALL client writes
 *                      are denied (server-only), so protected fields (role,
 *                      isActive, emailVerified) can never be self-set.
 *  user_addresses    : server-only — no client read/write at all.
 *
 * Run with the Firestore emulator + @firebase/rules-unit-testing:
 *   RUN_EMULATOR_TESTS=1 firebase emulators:exec "vitest run **/*.emulator.test.ts"
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'evm-auth-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
  // Seed a profile via the admin (rules-bypassing) context.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/userA'), { email: 'a@b.com', role: 'customer', isActive: true });
    await setDoc(doc(ctx.firestore(), 'user_addresses/addr1'), { userId: 'userA', city: 'BLR' });
  });
});

afterAll(async () => {
  await env?.cleanup();
});

describe('users/{uid}', () => {
  it('user can read their own profile', async () => {
    const db = env.authenticatedContext('userA').firestore();
    await assertSucceeds(getDoc(doc(db, 'users/userA')));
  });
  it('user cannot read another user profile', async () => {
    const db = env.authenticatedContext('userB').firestore();
    await assertFails(getDoc(doc(db, 'users/userA')));
  });
  it('user cannot write their own profile (server-only) — no self-promotion', async () => {
    const db = env.authenticatedContext('userA').firestore();
    await assertFails(setDoc(doc(db, 'users/userA'), { role: 'admin' }, { merge: true }));
    await assertFails(setDoc(doc(db, 'users/userA'), { isActive: true }, { merge: true }));
  });
});

describe('user_addresses', () => {
  it('client cannot read addresses directly (server-only)', async () => {
    const db = env.authenticatedContext('userA').firestore();
    await assertFails(getDoc(doc(db, 'user_addresses/addr1')));
  });
  it('client cannot write addresses directly', async () => {
    const db = env.authenticatedContext('userA').firestore();
    await assertFails(setDoc(doc(db, 'user_addresses/new'), { userId: 'userA' }));
    // cannot forge another user's address either
    await assertFails(setDoc(doc(db, 'user_addresses/evil'), { userId: 'userB' }));
  });
});
