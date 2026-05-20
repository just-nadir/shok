import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { validateRatingRequest } from '../validators/ratingValidator';

// Ensure session types are loaded
import '../types/index';

const router = Router();

// POST /api/ratings
router.post('/', async (req: Request, res: Response): Promise<void> => {
  // Telegram orqali autentifikatsiya tekshirish
  if (!req.session.telegramId) {
    res.status(401).json({ error: 'Telegram orqali kiring', code: 'UNAUTHORIZED' });
    return;
  }

  const validation = validateRatingRequest(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.errors[0], code: 'VALIDATION_ERROR' });
    return;
  }

  const {
    driverId,
    overallRating,
    cleanliness,
    politeness,
    drivingStyle,
    punctuality,
    comment,
  } = req.body as {
    driverId: string;
    overallRating: number;
    cleanliness?: string;
    politeness?: string;
    drivingStyle?: string;
    punctuality?: string;
    comment?: string;
  };

  // Haydovchini tekshirish
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

  // 24 soatlik limit — telegram_user_id bo'yicha
  const telegramId = req.session.telegramId;
  const recentResult = await query<{ id: string }>(
    `SELECT id FROM ratings
     WHERE telegram_user_id = $1 AND driver_id = $2 AND created_at > NOW() - INTERVAL '24 hours'
     LIMIT 1`,
    [telegramId, driver.id]
  );

  if (recentResult.rows.length > 0) {
    res.status(429).json({
      error: 'Siz bu haydovchini bugun allaqachon baholagansiz',
      code: 'ALREADY_RATED',
    });
    return;
  }

  // Baholash saqlash
  const insertResult = await query<{ id: string }>(
    `INSERT INTO ratings
       (driver_id, telegram_user_id, overall_rating, cleanliness, politeness, driving_style, punctuality, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      driver.id,
      telegramId,
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
