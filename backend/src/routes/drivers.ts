import { Router, Request, Response } from 'express';
import { query } from '../db/pool';

// Ensure session types are loaded
import '../types/index';

const router = Router();

// GET /api/driver/:qrCode
// Requirements: 1.2, 1.3, 7.6
router.get('/:qrCode', async (req: Request, res: Response): Promise<void> => {
  const { qrCode } = req.params;

  const result = await query<{
    id: string;
    full_name: string;
    car_number: string;
    qr_code: string;
    is_blocked: boolean;
  }>(
    `SELECT id, full_name, car_number, qr_code, is_blocked
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
    qrCode: driver.qr_code,
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
