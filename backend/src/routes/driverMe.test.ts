// Feature: shok-taxi-driver-rating, Property 5: Haydovchi faqat o'z ma'lumotlarini ko'radi
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Simulates the driver isolation logic used in GET /api/driver/me/stats
 * and GET /api/driver/me/ratings.
 *
 * In the real route, `sessionDriverId` comes from req.session.userId and
 * the SQL query always filters by `WHERE driver_id = $1` using that value.
 * This function models that filtering behaviour.
 *
 * Validates: Requirement 6.5
 */
function filterRatingsForDriver(
  allRatings: Array<{ driverId: string; overallRating: number }>,
  sessionDriverId: string
): Array<{ driverId: string; overallRating: number }> {
  return allRatings.filter((r) => r.driverId === sessionDriverId);
}

describe('Driver isolation – Property 5: Haydovchi faqat o\'z ma\'lumotlarini ko\'radi', () => {
  /**
   * Property 5a: All returned ratings belong to the requesting driver.
   * No rating from another driver leaks into the response.
   * Validates: Requirement 6.5
   */
  it('Property 5a: qaytarilgan barcha baholashlar faqat so\'ralgan haydovchiga tegishli', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(
          fc.record({
            driverId: fc.uuid(),
            overallRating: fc.integer({ min: 1, max: 5 }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (sessionDriverId, allRatings) => {
          const result = filterRatingsForDriver(allRatings, sessionDriverId);
          // Every returned rating must belong to the session driver
          expect(result.every((r) => r.driverId === sessionDriverId)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5b: Ratings belonging to the session driver are never excluded.
   * Validates: Requirement 6.5
   */
  it('Property 5b: haydovchining o\'z baholashlari hech qachon chiqarib tashlanmaydi', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 10 }),
        (sessionDriverId, ownRatings) => {
          const ownEntries = ownRatings.map((r) => ({
            driverId: sessionDriverId,
            overallRating: r,
          }));
          const result = filterRatingsForDriver(ownEntries, sessionDriverId);
          expect(result.length).toBe(ownEntries.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5c: When the session driver has no ratings, the result is empty.
   * Validates: Requirement 6.5
   */
  it('Property 5c: boshqa haydovchilarning baholashlari hech qachon qaytarilmaydi', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 10 }),
        (sessionDriverId, otherDriverId, otherRatings) => {
          fc.pre(sessionDriverId !== otherDriverId);
          const otherEntries = otherRatings.map((r) => ({
            driverId: otherDriverId,
            overallRating: r,
          }));
          const result = filterRatingsForDriver(otherEntries, sessionDriverId);
          expect(result.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
