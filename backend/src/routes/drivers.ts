import { Router, Request, Response } from 'express';
import { query } from '../db/pool';

// Ensure session types are loaded
import '../types/index';

const router = Router();

// GET /api/drivers/search?q=... — avtomobil raqami yoki telefon bo'yicha qidirish
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const { q } = req.query as { q?: string };
  if (!q?.trim()) {
    res.status(400).json({ error: 'Qidiruv so\'zi kerak', code: 'MISSING_QUERY' });
    return;
  }

  const search = q.trim().toLowerCase();

  const result = await query<{
    id: string;
    full_name: string;
    car_number: string;
    car_model: string | null;
    car_color: string | null;
    avatar_url: string | null;
    qr_code: string;
    is_blocked: boolean;
  }>(
    `SELECT id, full_name, car_number, car_model, car_color, avatar_url, qr_code, is_blocked
     FROM drivers
     WHERE is_blocked = FALSE
       AND (LOWER(car_number) LIKE $1 OR phone LIKE $1)
     LIMIT 10`,
    [`%${search}%`]
  );

  res.status(200).json({
    drivers: result.rows.map(d => ({
      id: d.id,
      fullName: d.full_name,
      carNumber: d.car_number,
      carModel: d.car_model ?? undefined,
      carColor: d.car_color ?? undefined,
      avatarUrl: d.avatar_url ?? undefined,
      qrCode: d.qr_code,
      isBlocked: d.is_blocked,
    })),
  });
});

// GET /api/driver/:qrCode
// Requirements: 1.2, 1.3, 7.6
router.get('/:qrCode', async (req: Request, res: Response): Promise<void> => {
  const { qrCode } = req.params;

  const result = await query<{
    id: string;
    full_name: string;
    car_number: string;
    car_model: string | null;
    car_color: string | null;
    avatar_url: string | null;
    qr_code: string;
    is_blocked: boolean;
  }>(
    `SELECT id, full_name, car_number, car_model, car_color, avatar_url, qr_code, is_blocked
     FROM drivers
     WHERE qr_code = $1
     LIMIT 1`,
    [qrCode]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'QR kod yaroqsiz yoki topilmadi', code: 'DRIVER_NOT_FOUND' });
    return;
  }

  const driver = result.rows[0];

  if (driver.is_blocked) {
    res.status(403).json({ error: 'Bu haydovchi hozirda baholanmaydi', code: 'DRIVER_BLOCKED' });
    return;
  }

  res.status(200).json({
    id: driver.id,
    fullName: driver.full_name,
    carNumber: driver.car_number,
    carModel: driver.car_model ?? undefined,
    carColor: driver.car_color ?? undefined,
    avatarUrl: driver.avatar_url ?? undefined,
    qrCode: driver.qr_code,
  });
});

export default router;
