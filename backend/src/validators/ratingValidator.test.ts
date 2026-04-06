// Feature: shok-taxi-driver-rating, Property 1: Yulduz reytingi chegarasi
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateOverallRating } from './ratingValidator';

/**
 * Validates: Requirement 2.3
 * Property 1: For any random integer, values outside 1–5 are rejected; values 1–5 are accepted.
 */
describe('validateOverallRating - Property 1: Yulduz reytingi chegarasi', () => {
  it('rejects any integer outside [1, 5]', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 6 })),
        (value) => {
          expect(validateOverallRating(value)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts any integer in [1, 5]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (value) => {
          expect(validateOverallRating(value)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-integer numbers (floats)', () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true }).filter((n) => !Number.isInteger(n)),
        (value) => {
          expect(validateOverallRating(value)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-number types (strings, null, undefined, objects)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.constant(null),
          fc.constant(undefined),
          fc.object()
        ),
        (value) => {
          expect(validateOverallRating(value)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: shok-taxi-driver-rating, Property 2: Izoh uzunligi cheklovi
import { validateComment } from './ratingValidator';

/**
 * Validates: Requirements 4.2, 4.3
 * Property 2: For any random-length string, strings longer than 500 chars are rejected; strings ≤500 chars are accepted.
 */
describe('validateComment - Property 2: Izoh uzunligi cheklovi', () => {
  it('rejects any string with length > 500', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 501 }),
        (value) => {
          expect(validateComment(value)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts any string with length ≤ 500', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 500 }),
        (value) => {
          expect(validateComment(value)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts null and undefined (optional field)', () => {
    expect(validateComment(null)).toBe(true);
    expect(validateComment(undefined)).toBe(true);
  });

  it('rejects non-string, non-null, non-undefined values (numbers, objects, arrays)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.float({ noNaN: true, noDefaultInfinity: true }),
          fc.object(),
          fc.array(fc.anything())
        ),
        (value) => {
          expect(validateComment(value)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: shok-taxi-driver-rating, Property 9: Kategoriya bahosi validatsiyasi
import { validateCategoryValue } from './ratingValidator';

/**
 * Validates: Requirement 3.3
 * Property 9: For any random category value, only 'good', 'average', 'bad' are accepted — all other values are rejected.
 */
describe('validateCategoryValue - Property 9: Kategoriya bahosi validatsiyasi', () => {
  it('accepts valid category values: good, average, bad', () => {
    expect(validateCategoryValue('good')).toBe(true);
    expect(validateCategoryValue('average')).toBe(true);
    expect(validateCategoryValue('bad')).toBe(true);
  });

  it('accepts null and undefined (optional field)', () => {
    expect(validateCategoryValue(null)).toBe(true);
    expect(validateCategoryValue(undefined)).toBe(true);
  });

  it('rejects any random string that is not one of the 3 valid values', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !['good', 'average', 'bad'].includes(s)),
        (value) => {
          expect(validateCategoryValue(value)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-string, non-null, non-undefined values (numbers, objects, booleans)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.float({ noNaN: true, noDefaultInfinity: true }),
          fc.object(),
          fc.boolean()
        ),
        (value) => {
          expect(validateCategoryValue(value)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
