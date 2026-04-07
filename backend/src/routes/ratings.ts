import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/pool';
import { validateRatingRequest } from '../validators/ratingValidator';

// Ensure session types are loaded
import '../types/index';

const SALT_ROUNDS = 10;

const router = Router();

// POST /api/ratings
// Requirements: 1.2, 5.1, 5.4, 7.6
router.post('/', async (req: Request, res: Response): Promise<void> => {
  // Validate request body
  const validation = validateRatingRequest(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.errors[0], code: 'VALIDATION_ERROR' });
    return;
  }

  const {
    driverId,
    phone,
    overallRating,
    cleanliness,
    politeness,
    drivingStyle,
    punctuality,
    comment,
  } = req.body as {
    driverId: string;
    phone: string;
    overallRating: number;
    cleanliness?: string;
    politeness?: string;
    drivingStyle?: string;
    punctuality?: string;
    comment?: string;
  };

  // Look up driver by ID
  const driverResult = await query<{ id: string; is_blocked: boolean }>(
    `SELECT id, is_blocked FROM drivers WHERE id = $1 LIMIT 1`,
    [driverId]
  );

  if (driverResult.rows.length === 0) {
    res.status(404).json({ error: 'Haydovchi topilmadi', code: 'DRIVER_NOT_FOUND' });
    return;
  }

  const driver = driverResult.rows[0];

  if (driver.is_blocked) {
    res.status(403).json({ error: 'Bu haydovchi hozirda baholanmaydi', code: 'DRIVER_BLOCKED' });
    return;
  }

  // Check 24-hour re-rating block
  // Since phone is stored as bcrypt hash, fetch recent hashes and compare
  const recentRatings = await query<{ phone_hash: string }>(
    `SELECT phone_hash FROM ratings
     WHERE driver_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
    [driver.id]
  );

  for (const row of recentRatings.rows) {
    const match = await bcrypt.compare(phone, row.phone_hash);
    if (match) {
      res.status(429).json({
        error: 'Siz bu haydovchini bugun allaqachon baholagansiz',
        code: 'ALREADY_RATED',
      });
      return;
    }
  }

  // Hash phone and insert rating
  const phoneHash = await bcrypt.hash(phone, SALT_ROUNDS);

  const insertResult = await query<{ id: string }>(
    `INSERT INTO ratings
       (driver_id, phone_hash, overall_rating, cleanliness, politeness, driving_style, punctuality, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      driver.id,
      phoneHash,
      overallRating,
      cleanliness ?? null,
      politeness ?? null,
      drivingStyle ?? null,
      punctuality ?? null,
      comment ?? null,
    ]
  );

  res.status(201).json({
    message: 'Baholingiz qabul qilindi. Rahmat!',
    ratingId: insertResult.rows[0].id,
  });
});

export default router;
