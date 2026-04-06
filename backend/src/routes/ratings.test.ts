// Feature: shok-taxi-driver-rating, Property 3: 24 soatlik qayta baholash bloki
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 4; // fast for tests

/**
 * Core 24-hour re-rating block check logic extracted from the route handler.
 * Validates: Requirement 5.4
 */
async function hasRatedInLast24h(
  phone: string,
  recentHashes: string[]
): Promise<boolean> {
  for (const hash of recentHashes) {
    if (await bcrypt.compare(phone, hash)) return true;
  }
  return false;
}

describe('hasRatedInLast24h – Property 3: 24 soatlik qayta baholash bloki', () => {
  /**
   * Property 3a: If recentHashes contains a bcrypt hash of the phone,
   * the function returns true (block applies).
   * Validates: Requirement 5.4
   */
  it(`Property 3a: telefon heshi mavjud bo'lsa true qaytaradi`, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (phone) => {
          const hash = await bcrypt.hash(phone, SALT_ROUNDS);
          const result = await hasRatedInLast24h(phone, [hash]);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 3b: If recentHashes is empty, the function returns false (no block).
   * Validates: Requirement 5.4
   */
  it(`Property 3b: recentHashes bo'sh bo'lsa false qaytaradi`, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (phone) => {
          const result = await hasRatedInLast24h(phone, []);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3c: If recentHashes contains hashes of DIFFERENT phones,
   * the function returns false.
   * Validates: Requirement 5.4
   */
  it(`Property 3c: boshqa telefonlar heshi bo'lsa false qaytaradi`, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            fc.string({ minLength: 1, maxLength: 10 }),
            fc.string({ minLength: 1, maxLength: 10 })
          )
          .filter(([a, b]) => a !== b),
        async ([phoneA, phoneB]) => {
          // Hash phoneB, then check phoneA against it — should not match
          const hashOfB = await bcrypt.hash(phoneB, SALT_ROUNDS);
          const result = await hasRatedInLast24h(phoneA, [hashOfB]);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });
});
