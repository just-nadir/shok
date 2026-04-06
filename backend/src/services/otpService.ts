import bcrypt from 'bcrypt';
import { query } from '../db/pool';

// --- Eskiz.uz token cache ---
let eskizToken: string | null = null;
let eskizTokenExpiry: number = 0;

/** Reset token cache — for testing only */
export function _resetTokenCache(): void {
  eskizToken = null;
  eskizTokenExpiry = 0;
}

async function getEskizToken(): Promise<string> {
  if (eskizToken && Date.now() < eskizTokenExpiry) {
    return eskizToken;
  }

  const email = process.env.ESKIZ_EMAIL;
  const password = process.env.ESKIZ_PASSWORD;

  if (!email || !password) {
    throw new Error('ESKIZ_EMAIL va ESKIZ_PASSWORD muhit o\'zgaruvchilari kerak');
  }

  const res = await fetch('https://notify.eskiz.uz/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Eskiz.uz login xatosi: ${res.status}`);
  }

  const data = (await res.json()) as { data?: { token?: string } };
  const token = data?.data?.token;

  if (!token) {
    throw new Error('Eskiz.uz tokenini olishda xato');
  }

  eskizToken = token;
  // Token 29 daqiqa amal qiladi (30 daqiqadan biroz kam)
  eskizTokenExpiry = Date.now() + 29 * 60 * 1000;

  return eskizToken;
}

// --- OTP generatsiya ---
export function generateOTP(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return digits.toString();
}

// --- SMS yuborish ---
export async function sendOTP(phone: string): Promise<void> {
  const code = generateOTP();
  const saltRounds = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS, 10) : 10;
  const codeHash = await bcrypt.hash(code, saltRounds);

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 daqiqa

  await query(
    `INSERT INTO otp_codes (phone, code_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [phone, codeHash, expiresAt]
  );

  const token = await getEskizToken();
  const sender = process.env.ESKIZ_SENDER || '4546';
  const message = `Shok Taksi: tasdiqlash kodi ${code}. 5 daqiqa ichida amal qiladi.`;

  const smsRes = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      mobile_phone: phone,
      message,
      from: sender,
      callback_url: '',
    }),
  });

  if (!smsRes.ok) {
    // Token muddati o'tgan bo'lishi mumkin — bir marta qayta urinib ko'ramiz
    if (smsRes.status === 401) {
      eskizToken = null;
      eskizTokenExpiry = 0;
      const freshToken = await getEskizToken();

      const retryRes = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
        },
        body: JSON.stringify({
          mobile_phone: phone,
          message,
          from: sender,
          callback_url: '',
        }),
      });

      if (!retryRes.ok) {
        throw new Error(`SMS yuborishda xato: ${retryRes.status}`);
      }
    } else {
      throw new Error(`SMS yuborishda xato: ${smsRes.status}`);
    }
  }
}

// --- OTP tekshirish ---
export async function verifyOTP(phone: string, code: string): Promise<boolean> {
  const result = await query<{
    id: string;
    code_hash: string;
  }>(
    `SELECT id, code_hash
     FROM otp_codes
     WHERE phone = $1
       AND used = FALSE
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const { id, code_hash } = result.rows[0];
  const isValid = await bcrypt.compare(code, code_hash);

  if (isValid) {
    await query(
      `UPDATE otp_codes SET used = TRUE WHERE id = $1`,
      [id]
    );
  }

  return isValid;
}
