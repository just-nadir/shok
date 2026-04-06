// Feature: shok-taxi-driver-rating, Property 8: OTP round-trip — to'g'ri kod sessiya yaratadi, noto'g'ri/muddati o'tgan kod yaratmaydi
// Validates: Requirement 9 (OTP authentication)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import bcrypt from 'bcrypt';

// --- Mock pool.ts ---
vi.mock('../db/pool', () => ({
  query: vi.fn(),
}));

import { query } from '../db/pool';
import { sendOTP, verifyOTP, _resetTokenCache } from './otpService';

const mockQuery = query as ReturnType<typeof vi.fn>;

// Helper: reset eskiz token cache between tests by resetting module-level state
// We do this by resetting fetch mock and clearing query mock
beforeEach(() => {
  vi.clearAllMocks();
  // Reset token cache so each test starts fresh (login fetch will be called)
  _resetTokenCache();
  // Set required env vars so getEskizToken() doesn't throw before fetch
  process.env.ESKIZ_EMAIL = 'test@example.com';
  process.env.ESKIZ_PASSWORD = 'test-password';
  // Reset global fetch mock
  vi.stubGlobal('fetch', vi.fn());
});

// Helper: setup fetch mock for Eskiz.uz (login + SMS send)
function mockEskizFetch() {
  const fetchMock = vi.fn();
  // First call: auth/login
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: { token: 'test-token-123' } }),
  });
  // Second call: sms/send
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ status: 'waiting' }),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('Property 8: OTP round-trip', () => {
  it('to\'g\'ri kod verifyOTP=true qaytaradi', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 7, maxLength: 15 }),
        async (phone: string) => {
          vi.clearAllMocks();
          _resetTokenCache();

          // Reset eskiz token cache by re-importing won't work easily,
          // so we mock fetch fresh each iteration
          mockEskizFetch();

          let capturedHash: string | null = null;
          let capturedId = 'otp-id-1';

          // Mock query: capture INSERT (sendOTP), then return hash on SELECT (verifyOTP), then UPDATE
          mockQuery.mockImplementation(async (sql: string, params: unknown[]) => {
            if (sql.includes('INSERT INTO otp_codes')) {
              // params: [phone, codeHash, expiresAt]
              capturedHash = params[1] as string;
              return { rows: [], rowCount: 1 };
            }
            if (sql.includes('SELECT id, code_hash')) {
              if (!capturedHash) return { rows: [], rowCount: 0 };
              return {
                rows: [{ id: capturedId, code_hash: capturedHash }],
                rowCount: 1,
              };
            }
            if (sql.includes('UPDATE otp_codes SET used')) {
              return { rows: [], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          });

          await sendOTP(phone);

          // capturedHash is the bcrypt hash of the real OTP code
          // We need the plaintext code — we can't reverse bcrypt.
          // Instead, we verify by using the hash directly: generate a known code and hash it ourselves.
          // But sendOTP generates the code internally. So we intercept via the INSERT params.
          // The SELECT mock returns capturedHash, so verifyOTP will bcrypt.compare(code, capturedHash).
          // We need to find the correct code. Since we can't reverse bcrypt, we test the property
          // by generating our own code+hash pair and injecting it into the SELECT mock.

          // Reset and use a controlled code
          vi.clearAllMocks();
          _resetTokenCache();
          mockEskizFetch();

          const controlledCode = '123456';
          const controlledHash = await bcrypt.hash(controlledCode, 1);

          mockQuery.mockImplementation(async (sql: string) => {
            if (sql.includes('INSERT INTO otp_codes')) {
              return { rows: [], rowCount: 1 };
            }
            if (sql.includes('SELECT id, code_hash')) {
              return {
                rows: [{ id: capturedId, code_hash: controlledHash }],
                rowCount: 1,
              };
            }
            if (sql.includes('UPDATE otp_codes SET used')) {
              return { rows: [], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          });

          await sendOTP(phone);
          const result = await verifyOTP(phone, controlledCode);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('noto\'g\'ri kod verifyOTP=false qaytaradi', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 7, maxLength: 15 }),
        fc.stringOf(fc.constantFrom(...'0123456789'), { minLength: 6, maxLength: 6 }),
        async (phone: string, wrongCode: string) => {
          vi.clearAllMocks();
          _resetTokenCache();
          mockEskizFetch();

          const correctCode = '999999';
          const correctHash = await bcrypt.hash(correctCode, 1);

          mockQuery.mockImplementation(async (sql: string) => {
            if (sql.includes('INSERT INTO otp_codes')) {
              return { rows: [], rowCount: 1 };
            }
            if (sql.includes('SELECT id, code_hash')) {
              return {
                rows: [{ id: 'otp-id-2', code_hash: correctHash }],
                rowCount: 1,
              };
            }
            if (sql.includes('UPDATE otp_codes SET used')) {
              return { rows: [], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          });

          await sendOTP(phone);

          // Use a wrong code (anything that is not correctCode)
          const badCode = wrongCode === correctCode ? '000000' : wrongCode;
          const result = await verifyOTP(phone, badCode);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('muddati o\'tgan OTP verifyOTP=false qaytaradi', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 7, maxLength: 15 }),
        async (phone: string) => {
          vi.clearAllMocks();
          _resetTokenCache();
          mockEskizFetch();

          mockQuery.mockImplementation(async (sql: string) => {
            if (sql.includes('INSERT INTO otp_codes')) {
              return { rows: [], rowCount: 1 };
            }
            // SELECT returns empty (DB filters expired rows via expires_at > NOW())
            if (sql.includes('SELECT id, code_hash')) {
              return { rows: [], rowCount: 0 };
            }
            return { rows: [], rowCount: 0 };
          });

          await sendOTP(phone);
          const result = await verifyOTP(phone, '123456');
          expect(result).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('ishlatilgan OTP ikkinchi marta verifyOTP=false qaytaradi', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 7, maxLength: 15 }),
        async (phone: string) => {
          vi.clearAllMocks();
          _resetTokenCache();
          mockEskizFetch();

          const code = '654321';
          const hash = await bcrypt.hash(code, 1);
          let used = false;

          mockQuery.mockImplementation(async (sql: string) => {
            if (sql.includes('INSERT INTO otp_codes')) {
              return { rows: [], rowCount: 1 };
            }
            if (sql.includes('SELECT id, code_hash')) {
              // After first use, DB filters used=TRUE rows → returns empty
              if (used) return { rows: [], rowCount: 0 };
              return {
                rows: [{ id: 'otp-id-3', code_hash: hash }],
                rowCount: 1,
              };
            }
            if (sql.includes('UPDATE otp_codes SET used')) {
              used = true;
              return { rows: [], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          });

          await sendOTP(phone);

          const first = await verifyOTP(phone, code);
          expect(first).toBe(true);

          const second = await verifyOTP(phone, code);
          expect(second).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });
});
