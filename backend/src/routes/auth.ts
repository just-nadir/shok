import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { isBlocked, recordAttempt, clearAttempts } from '../middleware/rateLimiter';
import { query } from '../db/pool';
import { verifyTelegramIdToken } from '../services/telegramAuth';

// Ensure session types are loaded
import '../types/index';

const router = Router();

// --- Mini App initData verification ---
function verifyTelegramWebAppData(initData: string, botToken: string): { valid: boolean; user?: { id: number; first_name: string; last_name?: string; username?: string } } {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { valid: false };

  params.delete('hash');
  const dataCheckArr = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${key}=${val}`);
  const dataCheckString = dataCheckArr.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) return { valid: false };

  const userStr = params.get('user');
  if (!userStr) return { valid: false };

  try {
    const user = JSON.parse(userStr) as { id: number; first_name: string; last_name?: string; username?: string };
    return { valid: true, user };
  } catch {
    return { valid: false };
  }
}

// POST /api/auth/telegram-webapp — Mini App orqali avtomatik kirish
router.post('/telegram-webapp', async (req: Request, res: Response): Promise<void> => {
  const { initData } = req.body as { initData?: string };

  if (!initData) {
    res.status(400).json({ error: 'initData kerak', code: 'MISSING_INIT_DATA' });
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    res.status(500).json({ error: 'Server konfiguratsiya xatosi', code: 'CONFIG_ERROR' });
    return;
  }

  const result = verifyTelegramWebAppData(initData, botToken);
  if (!result.valid || !result.user) {
    res.status(401).json({ error: 'initData yaroqsiz', code: 'INVALID_INIT_DATA' });
    return;
  }

  req.session.userId = String(result.user.id);
  req.session.role = 'customer';
  req.session.telegramId = result.user.id;

  res.status(200).json({
    message: 'Kirish muvaffaqiyatli',
    user: {
      id: result.user.id,
      name: [result.user.first_name, result.user.last_name].filter(Boolean).join(' '),
    },
  });
});

// POST /api/auth/telegram — Telegram Login orqali kirish
router.post('/telegram', async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body as { idToken?: string };

  if (!idToken) {
    res.status(400).json({ error: 'Token kerak', code: 'MISSING_TOKEN' });
    return;
  }

  try {
    const payload = await verifyTelegramIdToken(idToken);

    req.session.userId = String(payload.id);
    req.session.role = 'customer';
    req.session.phone = payload.phone_number || null;
    req.session.telegramId = payload.id;

    res.status(200).json({
      message: 'Kirish muvaffaqiyatli',
      user: {
        id: payload.id,
        name: payload.name || null,
        phone: payload.phone_number || null,
      },
    });
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : 'Autentifikatsiya xatosi',
      code: 'TELEGRAM_AUTH_FAILED',
    });
  }
});

// POST /api/auth/driver/login — Haydovchi parol bilan kirish
router.post('/driver/login', async (req: Request, res: Response): Promise<void> => {
  const { phone, password } = req.body as { phone?: string; password?: string };

  if (!phone || !password) {
    res.status(400).json({ error: 'Telefon va parol kerak', code: 'MISSING_FIELDS' });
    return;
  }

  const blocked = await isBlocked(phone);
  if (blocked) {
    res.status(423).json({ error: "Juda ko'p urinish. 15 daqiqadan so'ng urinib ko'ring", code: 'RATE_LIMITED' });
    return;
  }

  const driverResult = await query<{ id: string; full_name: string; car_number: string; is_blocked: boolean; password_hash: string }>(
    `SELECT id, full_name, car_number, is_blocked, password_hash FROM drivers WHERE phone = $1 LIMIT 1`,
    [phone]
  );

  if (driverResult.rows.length === 0) {
    await recordAttempt(phone);
    res.status(401).json({ error: "Telefon yoki parol noto'g'ri", code: 'INVALID_CREDENTIALS' });
    return;
  }

  const driver = driverResult.rows[0];

  if (driver.is_blocked) {
    res.status(403).json({ error: 'Haydovchi bloklangan', code: 'DRIVER_BLOCKED' });
    return;
  }

  const valid = await bcrypt.compare(password, driver.password_hash);
  if (!valid) {
    await recordAttempt(phone);
    res.status(401).json({ error: "Telefon yoki parol noto'g'ri", code: 'INVALID_CREDENTIALS' });
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
  const valid = await bcrypt.compare(password, admin.password_hash);

  if (!valid) {
    await recordAttempt(username);
    res.status(401).json({ error: "Login yoki parol noto'g'ri", code: 'INVALID_CREDENTIALS' });
    return;
  }

  await clearAttempts(username);
  req.session.userId = admin.id;
  req.session.role = 'admin';

  res.status(200).json({ message: 'Kirish muvaffaqiyatli', admin: { id: admin.id, username: admin.username } });
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response): void => {
  if (!req.session.userId || !req.session.role) {
    res.status(401).json({ error: 'Autentifikatsiya talab qilinadi', code: 'UNAUTHORIZED' });
    return;
  }
  res.status(200).json({
    role: req.session.role,
    userId: req.session.userId,
    telegramId: req.session.telegramId || null,
  });
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
