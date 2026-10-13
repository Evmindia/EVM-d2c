import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Static assertions that the shipped Firestore/Storage rules are DEFAULT DENY
 * and that sensitive collections are server-only. This is a fast guardrail;
 * full behavioral rule tests run against the emulator (*.emulator.test.ts,
 * opt-in via RUN_EMULATOR_TESTS).
 */
const root = fileURLToPath(new URL('../../', import.meta.url));
const firestoreRules = readFileSync(`${root}firestore.rules`, 'utf8');
const storageRules = readFileSync(`${root}storage.rules`, 'utf8');

describe('Firestore rules default-deny', () => {
  it('contains a catch-all deny for all documents', () => {
    expect(firestoreRules).toMatch(/match \/\{document=\*\*\}/);
    // the catch-all block denies read and write
    const tail = firestoreRules.slice(firestoreRules.indexOf('/{document=**}'));
    expect(tail).toMatch(/allow read, write: if false;/);
  });

  it('denies all client access to sensitive server-only collections', () => {
    for (const coll of [
      'payments',
      'refunds',
      'inventory',
      'shipments',
      'admin_users',
      'audit_logs',
      'carts',
      'orders',
      'idempotency_keys',
      'user_addresses',
    ]) {
      const re = new RegExp(`match /${coll}/\\{doc\\}\\s*\\{ allow read, write: if false;`);
      expect(firestoreRules).toMatch(re);
    }
  });
});

describe('User profile + address rules (Phase 5)', () => {
  it('users: read-own only, all writes server-only', () => {
    expect(firestoreRules).toMatch(
      /match \/users\/\{uid\}\s*\{[\s\S]*?allow get: if isOwner\(uid\);[\s\S]*?allow list, create, update, delete: if false;/,
    );
  });

  it('user_addresses: server-only (deny all client access)', () => {
    expect(firestoreRules).toMatch(
      /match \/user_addresses\/\{doc\}\s*\{ allow read, write: if false; \}/,
    );
  });
});

describe('Catalog rules (Phase 2)', () => {
  it('allows public read of ACTIVE products/categories only', () => {
    expect(firestoreRules).toMatch(
      /match \/products\/\{productId\}[\s\S]*?allow get, list: if resource\.data\.isActive == true;/,
    );
    expect(firestoreRules).toMatch(
      /match \/categories\/\{categoryId\}[\s\S]*?allow get, list: if resource\.data\.isActive == true;/,
    );
  });

  it('denies all client writes to products/categories (server/admin only)', () => {
    expect(firestoreRules).toMatch(
      /match \/products\/\{productId\}[\s\S]*?allow create, update, delete: if false;/,
    );
    expect(firestoreRules).toMatch(
      /match \/categories\/\{categoryId\}[\s\S]*?allow create, update, delete: if false;/,
    );
  });
});

describe('Storage rules default-deny', () => {
  it('contains a catch-all deny for all paths', () => {
    expect(storageRules).toMatch(/match \/\{allPaths=\*\*\}/);
    const tail = storageRules.slice(storageRules.indexOf('/{allPaths=**}'));
    expect(tail).toMatch(/allow read, write: if false;/);
  });

  it('product images are public-read but client-write denied', () => {
    expect(storageRules).toMatch(
      /match \/products\/\{allPaths=\*\*\}[\s\S]*?allow read: if true;[\s\S]*?allow write: if false;/,
    );
  });
});
