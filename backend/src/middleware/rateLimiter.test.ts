// Feature: shok-taxi-driver-rating, Property 7: Tasodifiy identifikator uchun 5 urinishdan so'ng bloklanadi
// Validates: Requirement 9.3

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// --- Mock pool.ts ---
vi.mock('../db/pool', () => ({
  query: vi.fn(),
}));

import { query } from '../db/pool';
import { recordAttempt, isBlocked, rateLimitMiddleware } from './rateLimiter';

const mockQuery = query as ReturnType<typeof vi.fn>;

/**
 * Build a mock query implementation that tracks attempt counts per identifier
 * in memory. Supports INSERT (increment) and SELECT COUNT (return count).
 */
function buildMockQuery(initialCounts: Map<string, number> = new Map()) {
  const counts = new Map<string, number>(initialCounts);

  return vi.fn(async (sql: string, params: unknown[]) => {
    const identifier = params?.[0] as string;

    if (sql.includes('INSERT INTO login_attempts')) {
      counts.set(identifier, (counts.get(identifier) ?? 0) + 1);
      return { rows: [], rowCount: 1 };
    }

    if (sql.includes('SELECT COUNT(*)')) {
      const count = counts.get(identifier) ?? 0;
      return { rows: [{ count: String(count) }], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Property 7: Tasodifiy identifikator uchun 5 urinishdan so\'ng bloklanadi', () => {
  it('5 urinishdan so\'ng isBlocked() true qaytaradi', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 64 }),
        async (identifier: string) => {
          const mock = buildMockQuery();
          mockQuery.mockImplementation(mock);

          // Record exactly 5 attempts
          for (let i = 0; i < 5; i++) {
            await recordAttempt(identifier);
          }

          const blocked = await isBlocked(identifier);
          expect(blocked).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('5 dan kam urinishda (0-4) isBlocked() false qaytaradi', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.integer({ min: 0, max: 4 }),
        async (identifier: string, attempts: number) => {
          const mock = buildMockQuery();
          mockQuery.mockImplementation(mock);

          for (let i = 0; i < attempts; i++) {
            await recordAttempt(identifier);
          }

          const blocked = await isBlocked(identifier);
          expect(blocked).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('bloklangan identifikator uchun rateLimitMiddleware 423 qaytaradi va next chaqirilmaydi', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 64 }),
        async (identifier: string) => {
          // Pre-populate 5 attempts so isBlocked returns true
          const counts = new Map([[identifier, 5]]);
          const mock = buildMockQuery(counts);
          mockQuery.mockImplementation(mock);

          const req = { body: { phone: identifier } } as any;
          const jsonMock = vi.fn();
          const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
          const res = { status: statusMock } as any;
          const next = vi.fn();

          await rateLimitMiddleware(req, res, next);

          expect(statusMock).toHaveBeenCalledWith(423);
          expect(jsonMock).toHaveBeenCalled();
          expect(next).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('bloklanmagan identifikator uchun rateLimitMiddleware next() chaqiradi', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.integer({ min: 0, max: 4 }),
        async (identifier: string, attempts: number) => {
          const counts = new Map([[identifier, attempts]]);
          const mock = buildMockQuery(counts);
          mockQuery.mockImplementation(mock);

          const req = { body: { phone: identifier } } as any;
          const jsonMock = vi.fn();
          const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
          const res = { status: statusMock } as any;
          const next = vi.fn();

          await rateLimitMiddleware(req, res, next);

          expect(next).toHaveBeenCalled();
          expect(statusMock).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });
});
