import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only before imports
vi.mock('server-only', () => ({}));

// In-memory Firestore store for testing
const mockDocs = new Map<string, any>();

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: () => ({
    collection: (_name: string) => ({
      doc: (id: string) => ({
        get: vi.fn().mockImplementation(async () => {
          const data = mockDocs.get(id);
          return {
            exists: Boolean(data),
            data: () => data,
          };
        }),
        set: vi.fn().mockImplementation(async (val: any) => {
          mockDocs.set(id, val);
        }),
        update: vi.fn().mockImplementation(async (val: any) => {
          const prev = mockDocs.get(id) || {};
          mockDocs.set(id, { ...prev, ...val });
        }),
        delete: vi.fn().mockImplementation(async () => {
          mockDocs.delete(id);
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/sms/kapsystem', () => ({
  sendOtpSms: vi.fn().mockResolvedValue(undefined),
}));

import { isWhitelistedPhone, verifyOtp, requestOtp, consumeOtp } from '@/services/auth/otp.service';

describe('OTP Service - Whitelisting and Verification', () => {
  beforeEach(() => {
    mockDocs.clear();
    delete process.env.OTP_WHITELISTED_PHONES;
  });

  describe('isWhitelistedPhone', () => {
    it('identifies HDFC security auditor phone 7624984192 in various formats', () => {
      expect(isWhitelistedPhone('7624984192')).toBe(true);
      expect(isWhitelistedPhone('+917624984192')).toBe(true);
      expect(isWhitelistedPhone('+91 7624984192')).toBe(true);
      expect(isWhitelistedPhone('917624984192')).toBe(true);
      expect(isWhitelistedPhone('07624984192')).toBe(true);
      expect(isWhitelistedPhone('+91-7624-984192')).toBe(true);
    });

    it('rejects regular customer phones not on the whitelist', () => {
      expect(isWhitelistedPhone('9876543210')).toBe(false);
      expect(isWhitelistedPhone('+919876543210')).toBe(false);
      expect(isWhitelistedPhone('')).toBe(false);
    });

    it('supports additional numbers added via OTP_WHITELISTED_PHONES env variable', () => {
      process.env.OTP_WHITELISTED_PHONES = '9999999999, +918888888888';
      expect(isWhitelistedPhone('9999999999')).toBe(true);
      expect(isWhitelistedPhone('+919999999999')).toBe(true);
      expect(isWhitelistedPhone('8888888888')).toBe(true);
      expect(isWhitelistedPhone('+918888888888')).toBe(true);
      expect(isWhitelistedPhone('7624984192')).toBe(true); // Hardcoded auditor number still works
      expect(isWhitelistedPhone('1111111111')).toBe(false);
    });
  });

  describe('verifyOtp for whitelisted auditor number (+917624984192)', () => {
    it('successfully verifies with the exact code from auditor screenshot (838357)', async () => {
      const ok = await verifyOtp('+917624984192', '838357');
      expect(ok).toBe(true);
    });

    it('successfully verifies with standard test code 123456', async () => {
      const ok = await verifyOtp('+917624984192', '123456');
      expect(ok).toBe(true);
    });

    it('successfully verifies with any 6-digit numeric code for automated audit tools', async () => {
      expect(await verifyOtp('+917624984192', '654321')).toBe(true);
      expect(await verifyOtp('7624984192', '999999')).toBe(true);
      expect(await verifyOtp('+917624984192', '000000')).toBe(true);
    });

    it('does not delete or lock out whitelisted phone on consumeOtp', async () => {
      await requestOtp('+917624984192');
      // Verify first time
      expect(await verifyOtp('+917624984192', '838357')).toBe(true);
      await consumeOtp('+917624984192');
      // Subsequent verification in the same audit run still succeeds
      expect(await verifyOtp('+917624984192', '838357')).toBe(true);
    });
  });

  describe('requestOtp for whitelisted auditor number', () => {
    it('does not throw rate limit error on rapid resend', async () => {
      await requestOtp('+917624984192');
      // Immediate second send should not throw rate_limited
      await expect(requestOtp('+917624984192')).resolves.not.toThrow();
    });
  });
});
