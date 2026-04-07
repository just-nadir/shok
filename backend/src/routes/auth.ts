import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { sendOTP, verifyOTP } from '../services/otpService';
import { isBlocked, recordAttempt, clearAttempts } from '../middleware/rateLimiter';
import { query } from '../db/pool';

// Ensure session types are loaded
import '../types/index';

const router = Router();

// POST /api/auth/send-otp
router.post('/send-otp', async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body as { phone?: string };

  if (!phone) {
    res.status(400).json({ error: 'Telefon raqami kerak', code: 'MISSING_PHONE' });
    return;
  }

  const blocked = await isBlocked(phone);
  if (blocked) {
    res.status(423).json({
      error: "Juda ko'p urinish. 15 daqiqadan so'ng urinib ko'ring",
      code: 'RATE_LIMITED',
    });
    return;
  }

  try {
    await sendOTP(phone);
    res.status(200).json({ message: 'OTP yuborildi' });
  } catch {
    res.status(500).json({ error: 'OTP yuborishda xato', code: 'OTP_SEND_ERROR' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const { phone, code } = req.body as { phone?: string; code?: string };

  if (!phone || !code) {
    res.status(400).json({ error: 'Telefon va kod kerak', code: 'MISSING_FIELDS' });
    return;
  }

  const blocked = await isBlocked(phone);
  if (blocked) {
    res.status(423).json({
      error: "Juda ko'p urinish. 15 daqiqadan so'ng urinib ko'ring",
      code: 'RATE_LIMITED',
    });
    return;
  }

  const valid = await verifyOTP(phone, code);

  if (valid) {
    await clearAttempts(phone);
    req.session.userId = phone;
    req.session.role = 'customer';
    req.session.phone = phone;
    res.status(200).json({ message: 'Tasdiqlandi' });
  } else {
    await recordAttempt(phone);
    res.status(401).json({ error: "Noto'g'ri yoki muddati o'tgan kod", code: 'INVALID_OTP' });
  }
});

// POST /api/auth/driver/login — OTP orqali kirish
router.post('/driver/login', async (req: Request, res: Response): Promise<void> => {
  const { phone, code } = req.body as { phone?: string; code?: string };

  if (!phone) {
    res.status(400).json({ error: 'Telefon raqami kerak', code: 'MISSING_PHONE' });
    return;
  }

  // Faqat telefon yuborilsa — OTP jo'natamiz
  if (!code) {
    const driverResult = await query<{ id: string }>(
      `SELECT id FROM drivers WHERE phone = $1 LIMIT 1`,
      [phone]
    );
    if (driverResult.rows.length === 0) {
      res.status(404).json({ error: 'Bu telefon raqam tizimda topilmadi', code: 'DRIVER_NOT_FOUND' });
      return;
    }
    const blocked = await isBlocked(phone);
    if (blocked) {
      res.status(423).json({ error: "Juda ko'p urinish. 15 daqiqadan so'ng urinib ko'ring", code: 'RATE_LIMITED' });
      return;
    }
    await sendOTP(phone);
    res.status(200).json({ message: 'OTP yuborildi' });
    return;
  }

  // Telefon + kod yuborilsa — tasdiqlash
  const blocked = await isBlocked(phone);
  if (blocked) {
    res.status(423).json({ error: "Juda ko'p urinish. 15 daqiqadan so'ng urinib ko'ring", code: 'RATE_LIMITED' });
    return;
  }

  const valid = await verifyOTP(phone, code);
  if (!valid) {
    await recordAttempt(phone);
    res.status(401).json({ error: "Noto'g'ri yoki muddati o'tgan kod", code: 'INVALID_OTP' });
    return;
  }

  const driverResult = await query<{ id: string; full_name: string; car_number: string; is_blocked: boolean }>(
    `SELECT id, full_name, car_number, is_blocked FROM drivers WHERE phone = $1 LIMIT 1`,
    [phone]
  );

  if (driverResult.rows.length === 0) {
    res.status(404).json({ error: 'Haydovchi topilmadi', code: 'DRIVER_NOT_FOUND' });
    return;
  }

  const driver = driverResult.rows[0];
  if (driver.is_blocked) {
    res.status(403).json({ error: 'Haydovchi bloklangan', code: 'DRIVER_BLOCKED' });
    return;
  }

  await clearAttempts(phone);
  req.session.userId = driver.id;
  req.session.role = 'driver';

  res.status(200).json({
    message: 'Kirish muvaffaqiyatli',
    driver: { id: driver.id, fullName: driver.full_name, carNumber: driver.car_number },
  });
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response): void => {
  if (!req.session.userId || !req.session.role || req.session.role === 'customer') {
    res.status(401).json({ error: 'Autentifikatsiya talab qilinadi', code: 'UNAUTHORIZED' });
    return;
  }
  res.status(200).json({ role: req.session.role, userId: req.session.userId });
});

// POST /api/auth/admin/login
router.post('/admin/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: 'Login va parol kerak', code: 'MISSING_FIELDS' });
    return;
  }

  const blocked = await isBlocked(username);
  if (blocked) {
    res.status(423).json({ error: "Juda ko'p urinish. 15 daqiqadan so'ng urinib ko'ring", code: 'RATE_LIMITED' });
    return;
  }

  const result = await query<{ id: string; username: string; password_hash: string }>(
    `SELECT id, username, password_hash FROM admins WHERE username = $1 LIMIT 1`,
    [username]
  );

  if (result.rows.length === 0) {
    await recordAttempt(username);
    res.status(401).json({ error: "Login yoki parol noto'g'ri", code: 'INVALID_CREDENTIALS' });
    return;
  }

  const admin = result.rows[0];
  const passwordValid = await bcrypt.compare(password, admin.password_hash);

  if (!passwordValid) {
    await recordAttempt(username);
    res.status(401).json({ error: "Login yoki parol noto'g'ri", code: 'INVALID_CREDENTIALS' });
    return;
  }

  await clearAttempts(username);
  req.session.userId = admin.id;
  req.session.role = 'admin';

  res.status(200).json({ message: 'Kirish muvaffaqiyatli', admin: { id: admin.id, username: admin.username } });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Chiqishda xato', code: 'LOGOUT_ERROR' });
      return;
    }
    res.status(200).json({ message: 'Chiqish muvaffaqiyatli' });
  });
});

export default router;
