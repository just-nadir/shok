// Feature: shok-taxi-driver-rating, Property 6: Bloklangan haydovchi QR kodi ishlamaydi
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Validates: Requirement 7.6
function isDriverAccessible(driver: { is_blocked: boolean } | null):
  { allowed: true } | { allowed: false; code: string; status: number } {
  if (!driver) return { allowed: false, code: 'DRIVER_NOT_FOUND', status: 404 };
  if (driver.is_blocked) return { allowed: false, code: 'DRIVER_BLOCKED', status: 403 };
  return { allowed: true };
}

describe('isDriverAccessible - Property 6: Bloklangan haydovchi QR kodi ishlamaydi', () => {
  // Validates: Requirement 7.6
  it('Property 6a: blocked driver always returns DRIVER_BLOCKED 403', () => {
    fc.assert(
      fc.property(
        fc.record({ is_blocked: fc.constant(true) }),
        (driver) => {
          const result = isDriverAccessible(driver);
          expect(result).toEqual({ allowed: false, code: 'DRIVER_BLOCKED', status: 403 });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Validates: Requirement 7.6
  it('Property 6b: non-blocked driver always returns allowed', () => {
    fc.assert(
      fc.property(
        fc.record({ is_blocked: fc.constant(false) }),
        (driver) => {
          const result = isDriverAccessible(driver);
          expect(result).toEqual({ allowed: true });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Validates: Requirement 7.6
  it('Property 6c: null driver returns DRIVER_NOT_FOUND 404', () => {
    const result = isDriverAccessible(null);
    expect(result).toEqual({ allowed: false, code: 'DRIVER_NOT_FOUND', status: 404 });
  });

  // Validates: Requirement 7.6
  it('Property 6d: for any is_blocked value, blocked driver is never allowed', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isBlocked) => {
          const result = isDriverAccessible({ is_blocked: isBlocked });
          if (isBlocked) {
            expect(result.allowed).toBe(false);
          } else {
            expect(result.allowed).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
