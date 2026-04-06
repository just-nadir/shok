import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/pool';

// Ensure session types are loaded
import '../types/index';

const router = Router();

/**
 * Auth middleware — faqat 'driver' roli bilan kirgan foydalanuvchilarga ruxsat beradi.
 * Talab 6.1, 6.5
 */
function requireDriver(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId || req.session.role !== 'driver') {
    res.status(401).json({ error: 'Autentifikatsiya talab qilinadi', code: 'UNAUTHORIZED' });
    return;
  }
  next();
}

// GET /api/driver/me/stats
// Requirements: 6.2, 6.3, 6.5
router.get('/stats', requireDriver, async (req: Request, res: Response): Promise<void> => {
  const driverId = req.session.userId!;

  const statsResult = await query<{
    average_rating: string;
    total_ratings: string;
    trend_30_days: string;
    avg_cleanliness: string;
    avg_politeness: string;
    avg_driving_style: string;
    avg_punctuality: string;
  }>(
    `SELECT
       ROUND(AVG(overall_rating)::numeric, 2)                                    AS average_rating,
       COUNT(*)                                                                   AS total_ratings,
       ROUND(AVG(CASE WHEN created_at > NOW() - INTERVAL '30 days'
                      THEN overall_rating END)::numeric, 2)                      AS trend_30_days,
       ROUND(AVG(CASE cleanliness
                   WHEN 'good'    THEN 3
                   WHEN 'average' THEN 2
                   WHEN 'bad'     THEN 1 END)::numeric, 2)                       AS avg_cleanliness,
       ROUND(AVG(CASE politeness
                   WHEN 'good'    THEN 3
                   WHEN 'average' THEN 2
                   WHEN 'bad'     THEN 1 END)::numeric, 2)                       AS avg_politeness,
       ROUND(AVG(CASE driving_style
                   WHEN 'good'    THEN 3
                   WHEN 'average' THEN 2
                   WHEN 'bad'     THEN 1 END)::numeric, 2)                       AS avg_driving_style,
       ROUND(AVG(CASE punctuality
                   WHEN 'good'    THEN 3
                   WHEN 'average' THEN 2
                   WHEN 'bad'     THEN 1 END)::numeric, 2)                       AS avg_punctuality
     FROM ratings
     WHERE driver_id = $1`,
    [driverId]
  );

  const row = statsResult.rows[0];

  res.status(200).json({
    averageRating: row.average_rating ? parseFloat(row.average_rating) : 0,
    totalRatings: parseInt(row.total_ratings, 10),
    trend30Days: row.trend_30_days ? parseFloat(row.trend_30_days) : 0,
    categoryAverages: {
      cleanliness: row.avg_cleanliness ? parseFloat(row.avg_cleanliness) : 0,
      politeness: row.avg_politeness ? parseFloat(row.avg_politeness) : 0,
      drivingStyle: row.avg_driving_style ? parseFloat(row.avg_driving_style) : 0,
      punctuality: row.avg_punctuality ? parseFloat(row.avg_punctuality) : 0,
    },
  });
});

// GET /api/driver/me/ratings
// Requirements: 6.4, 6.5 — maxfiy: faqat oy/yil ko'rsatiladi
router.get('/ratings', requireDriver, async (req: Request, res: Response): Promise<void> => {
  const driverId = req.session.userId!;

  const ratingsResult = await query<{
    id: string;
    overall_rating: number;
    cleanliness: string | null;
    politeness: string | null;
    driving_style: string | null;
    punctuality: string | null;
    comment: string | null;
    month_year: string;
  }>(
    `SELECT
       id,
       overall_rating,
       cleanliness,
       politeness,
       driving_style,
       punctuality,
       comment,
       TO_CHAR(created_at, 'YYYY-MM') AS month_year
     FROM ratings
     WHERE driver_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [driverId]
  );

  const ratings = ratingsResult.rows.map((r) => ({
    id: r.id,
    overallRating: r.overall_rating,
    cleanliness: r.cleanliness ?? undefined,
    politeness: r.politeness ?? undefined,
    drivingStyle: r.driving_style ?? undefined,
    punctuality: r.punctuality ?? undefined,
    comment: r.comment ?? undefined,
    monthYear: r.month_year,
  }));

  res.status(200).json({ ratings });
});

export default router;
