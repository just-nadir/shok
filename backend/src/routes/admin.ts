import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { query } from '../db/pool';

// Ensure session types are loaded
import '../types/index';

const router = Router();

/**
 * Auth middleware — faqat 'admin' roli bilan kirgan foydalanuvchilarga ruxsat beradi.
 * Talab 7.1
 */
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId || req.session.role !== 'admin') {
    res.status(401).json({ error: 'Admin huquqi talab qilinadi', code: 'UNAUTHORIZED' });
    return;
  }
  next();
}

// GET /api/admin/drivers
// Requirements: 7.2
router.get('/drivers', requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const result = await query<{
    id: string;
    full_name: string;
    car_number: string;
    qr_code: string;
    is_blocked: boolean;
    average_rating: string;
    total_ratings: string;
  }>(
    `SELECT
       d.id,
       d.full_name,
       d.car_number,
       d.qr_code,
       d.is_blocked,
       ROUND(AVG(r.overall_rating)::numeric, 2) AS average_rating,
       COUNT(r.id)                               AS total_ratings
     FROM drivers d
     LEFT JOIN ratings r ON r.driver_id = d.id
     GROUP BY d.id
     ORDER BY d.full_name`
  );

  const drivers = result.rows.map((d) => ({
    id: d.id,
    fullName: d.full_name,
    carNumber: d.car_number,
    qrCode: d.qr_code,
    isBlocked: d.is_blocked,
    averageRating: d.average_rating ? parseFloat(d.average_rating) : null,
    totalRatings: parseInt(d.total_ratings, 10),
  }));

  res.status(200).json({ drivers });
});

// GET /api/admin/drivers/:id/ratings
// Requirements: 7.3
router.get('/drivers/:id/ratings', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const driverResult = await query<{ id: string; full_name: string }>(
    `SELECT id, full_name FROM drivers WHERE id = $1 LIMIT 1`,
    [id]
  );

  if (driverResult.rows.length === 0) {
    res.status(404).json({ error: 'Haydovchi topilmadi', code: 'DRIVER_NOT_FOUND' });
    return;
  }

  const ratingsResult = await query<{
    id: string;
    overall_rating: number;
    cleanliness: string | null;
    politeness: string | null;
    driving_style: string | null;
    punctuality: string | null;
    comment: string | null;
    created_at: string;
  }>(
    `SELECT id, overall_rating, cleanliness, politeness, driving_style, punctuality, comment, created_at
     FROM ratings
     WHERE driver_id = $1
     ORDER BY created_at DESC`,
    [id]
  );

  res.status(200).json({
    driver: { id: driverResult.rows[0].id, fullName: driverResult.rows[0].full_name },
    ratings: ratingsResult.rows.map((r) => ({
      id: r.id,
      overallRating: r.overall_rating,
      cleanliness: r.cleanliness ?? undefined,
      politeness: r.politeness ?? undefined,
      drivingStyle: r.driving_style ?? undefined,
      punctuality: r.punctuality ?? undefined,
      comment: r.comment ?? undefined,
      createdAt: r.created_at,
    })),
  });
});

// GET /api/admin/ratings?from=YYYY-MM-DD&to=YYYY-MM-DD
// Requirements: 7.4
router.get('/ratings', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (from) {
    params.push(from);
    conditions.push(`r.created_at >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    conditions.push(`r.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<{
    id: string;
    driver_id: string;
    full_name: string;
    car_number: string;
    overall_rating: number;
    cleanliness: string | null;
    politeness: string | null;
    driving_style: string | null;
    punctuality: string | null;
    comment: string | null;
    created_at: string;
  }>(
    `SELECT r.id, r.driver_id, d.full_name, d.car_number,
            r.overall_rating, r.cleanliness, r.politeness, r.driving_style,
            r.punctuality, r.comment, r.created_at
     FROM ratings r
     JOIN drivers d ON d.id = r.driver_id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  );

  res.status(200).json({
    ratings: result.rows.map((r) => ({
      id: r.id,
      driverId: r.driver_id,
      driverName: r.full_name,
      carNumber: r.car_number,
      overallRating: r.overall_rating,
      cleanliness: r.cleanliness ?? undefined,
      politeness: r.politeness ?? undefined,
      drivingStyle: r.driving_style ?? undefined,
      punctuality: r.punctuality ?? undefined,
      comment: r.comment ?? undefined,
      createdAt: r.created_at,
    })),
  });
});

// GET /api/admin/ratings/export
// Requirements: 7.5
router.get('/ratings/export', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (from) {
    params.push(from);
    conditions.push(`r.created_at >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    conditions.push(`r.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query<{
    id: string;
    full_name: string;
    car_number: string;
    overall_rating: number;
    cleanliness: string | null;
    politeness: string | null;
    driving_style: string | null;
    punctuality: string | null;
    comment: string | null;
    created_at: string;
  }>(
    `SELECT r.id, d.full_name, d.car_number,
            r.overall_rating, r.cleanliness, r.politeness, r.driving_style,
            r.punctuality, r.comment, r.created_at
     FROM ratings r
     JOIN drivers d ON d.id = r.driver_id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  );

  const csv = buildCsv(result.rows);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ratings.csv"');
  res.status(200).send(csv);
});

// POST /api/admin/drivers/:id/block
// Requirements: 7.6
router.post('/drivers/:id/block', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { block } = req.body as { block?: boolean };

  const isBlocked = block !== false; // default to blocking

  const result = await query<{ id: string }>(
    `UPDATE drivers SET is_blocked = $1 WHERE id = $2 RETURNING id`,
    [isBlocked, id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Haydovchi topilmadi', code: 'DRIVER_NOT_FOUND' });
    return;
  }

  res.status(200).json({
    message: isBlocked ? 'Haydovchi bloklandi' : 'Haydovchi blokdan chiqarildi',
    driverId: id,
    isBlocked,
  });
});

// GET /api/admin/qr/:driverId
// Requirements: 1.1 — QR kod generatsiya
router.get('/qr/:driverId', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { driverId } = req.params;

  const result = await query<{ id: string; full_name: string; qr_code: string }>(
    `SELECT id, full_name, qr_code FROM drivers WHERE id = $1 LIMIT 1`,
    [driverId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Haydovchi topilmadi', code: 'DRIVER_NOT_FOUND' });
    return;
  }

  const driver = result.rows[0];

  // If driver has no QR code yet, generate and persist one
  let qrCode = driver.qr_code;
  if (!qrCode) {
    qrCode = crypto.randomBytes(32).toString('hex');
    await query(`UPDATE drivers SET qr_code = $1 WHERE id = $2`, [qrCode, driverId]);
  }

  res.status(200).json({
    driverId: driver.id,
    driverName: driver.full_name,
    qrCode,
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RatingRow {
  id: string;
  full_name: string;
  car_number: string;
  overall_rating: number;
  cleanliness: string | null;
  politeness: string | null;
  driving_style: string | null;
  punctuality: string | null;
  comment: string | null;
  created_at: string;
}

/**
 * Builds a CSV string from rating rows.
 * Exported for unit testing.
 * Requirements: 7.5
 */
export function buildCsv(rows: RatingRow[]): string {
  const header = [
    'ID',
    'Haydovchi',
    'Avtomobil',
    'Umumiy reyting',
    'Tozalik',
    'Xushmuomalalik',
    'Haydash uslubi',
    'Vaqtida kelish',
    'Izoh',
    'Sana',
  ].join(',');

  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    // Wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const dataRows = rows.map((r) =>
    [
      r.id,
      r.full_name,
      r.car_number,
      r.overall_rating,
      r.cleanliness,
      r.politeness,
      r.driving_style,
      r.punctuality,
      r.comment,
      r.created_at,
    ]
      .map(escapeCell)
      .join(',')
  );

  return [header, ...dataRows].join('\n');
}

export default router;
