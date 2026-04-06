import type { CategoryValue } from '../types';

const VALID_CATEGORY_VALUES: CategoryValue[] = ['good', 'average', 'bad'];
const MAX_COMMENT_LENGTH = 500;
const MIN_RATING = 1;
const MAX_RATING = 5;

/**
 * overallRating 1–5 oraliq tekshiruvi (faqat butun sonlar)
 * Talab 2.3
 */
export function validateOverallRating(value: unknown): boolean {
  if (typeof value !== 'number') return false;
  if (!Number.isInteger(value)) return false;
  return value >= MIN_RATING && value <= MAX_RATING;
}

/**
 * Kategoriya qiymati 'good'|'average'|'bad' yoki undefined/null tekshiruvi
 * Talab 3.3
 */
export function validateCategoryValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return VALID_CATEGORY_VALUES.includes(value as CategoryValue);
}

/**
 * Izoh 500 belgi cheklovi yoki undefined/null tekshiruvi
 * Talab 4.2, 4.3
 */
export function validateComment(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string') return false;
  return value.length <= MAX_COMMENT_LENGTH;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Baholash so'rovini to'liq validatsiya qilish
 * Talab 2.3, 3.3, 4.2, 4.3
 */
export function validateRatingRequest(req: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof req !== 'object' || req === null) {
    return { valid: false, errors: ["So'rov obyekt bo'lishi kerak"] };
  }

  const body = req as Record<string, unknown>;

  // driverQrCode tekshiruvi
  if (!body.driverQrCode || typeof body.driverQrCode !== 'string' || body.driverQrCode.trim() === '') {
    errors.push("driverQrCode majburiy va satr bo'lishi kerak");
  }

  // phone tekshiruvi
  if (!body.phone || typeof body.phone !== 'string' || body.phone.trim() === '') {
    errors.push("phone majburiy va satr bo'lishi kerak");
  }

  // overallRating tekshiruvi
  if (!validateOverallRating(body.overallRating)) {
    errors.push(`overallRating ${MIN_RATING} dan ${MAX_RATING} gacha butun son bo'lishi kerak`);
  }

  // Kategoriya qiymatlari tekshiruvi
  const categories = ['cleanliness', 'politeness', 'drivingStyle', 'punctuality'] as const;
  for (const cat of categories) {
    if (!validateCategoryValue(body[cat])) {
      errors.push(`${cat} qiymati 'good', 'average' yoki 'bad' bo'lishi kerak`);
    }
  }

  // Izoh tekshiruvi
  if (!validateComment(body.comment)) {
    errors.push(`Izoh ${MAX_COMMENT_LENGTH} belgidan oshmasligi kerak`);
  }

  return { valid: errors.length === 0, errors };
}
