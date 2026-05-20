import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import '../types/index';

const router = Router();

// GET /api/drivers/search?q=...
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const { q } = req.query as { q?: string };
  if (!q?.trim()) {
    res.status(400).json({ error: "Qidiruv so'zi kerak", code: 'MISSING_QUERY' });
    return;
  }

  const search = q.trim().toLowerCase();

  const result = await query<{
    id: string; full_name: string; car_number: string;
    car_model: string | null; car_color: string | null; avatar_url: string | null; is_blocked: boolean;
  }>(
    `SELECT id, full_name, car_number, car_model, car_color, avatar_url, is_blocked
     FROM drivers
     WHERE is_blocked = FALSE AND (LOWER(car_number) LIKE $1 OR phone LIKE $1)
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
      isBlocked: d.is_blocked,
    })),
  });
});

// GET /api/drivers/:id — haydovchini ID bo'yicha olish
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await query<{
    id: string; full_name: string; car_number: string;
    car_model: string | null; car_color: string | null; avatar_url: string | null; is_blocked: boolean;
  }>(
    `SELECT id, full_name, car_number, car_model, car_color, avatar_url, is_blocked
     FROM drivers WHERE id = $1 LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Haydovchi topilmadi', code: 'DRIVER_NOT_FOUND' });
    return;
  }

  const d = result.rows[0];

  if (d.is_blocked) {
    res.status(403).json({ error: 'Bu haydovchi hozirda baholanmaydi', code: 'DRIVER_BLOCKED' });
    return;
  }

  res.status(200).json({
    id: d.id,
    fullName: d.full_name,
    carNumber: d.car_number,
    carModel: d.car_model ?? undefined,
    carColor: d.car_color ?? undefined,
    avatarUrl: d.avatar_url ?? undefined,
    isBlocked: d.is_blocked,
  });
});

// GET /api/driver/phone/:phone — telefon raqami bo'yicha qidirish
router.get('/phone/:phone', async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.params;

  const result = await query<{
    id: string;
    full_name: string;
    car_number: string;
    qr_code: string;
    is_blocked: boolean;
  }>(
    `SELECT id, full_name, car_number, qr_code, is_blocked
     FROM drivers
     WHERE phone = $1
     LIMIT 1`,
    [phone]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Haydovchi topilmadi', code: 'DRIVER_NOT_FOUND' });
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
    qrCode: driver.qr_code,
  });
});

// GET /api/driver/car/:carNumber — avtomobil raqami bo'yicha qidirish
router.get('/car/:carNumber', async (req: Request, res: Response): Promise<void> => {
  const { carNumber } = req.params;

  const result = await query<{
    id: string;
    full_name: string;
    car_number: string;
    qr_code: string;
    is_blocked: boolean;
  }>(
    `SELECT id, full_name, car_number, qr_code, is_blocked
     FROM drivers
     WHERE UPPER(car_number) = UPPER($1)
     LIMIT 1`,
    [carNumber]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Avtomobil topilmadi', code: 'DRIVER_NOT_FOUND' });
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
    qrCode: driver.qr_code,
  });
});

export default router;
