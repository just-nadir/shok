import bcrypt from 'bcrypt';
import { query } from '../db/pool';

// --- TextUp.uz token cache ---
let textupToken: string | null = null;
let textupTokenExpiry: number = 0;
let textupUserId: string | null = null;

/** Reset token cache — for testing only */
export function _resetTokenCache(): void {
  textupToken = null;
  textupTokenExpiry = 0;
  textupUserId = null;
}

async function getTextUpToken(): Promise<string> {
  if (textupToken && Date.now() < textupTokenExpiry) {
    return textupToken;
  }

  const email = process.env.TEXTUP_EMAIL;
  const password = process.env.TEXTUP_PASSWORD;

  if (!email || !password) {
    throw new Error('TEXTUP_EMAIL va TEXTUP_PASSWORD muhit o\'zgaruvchilari kerak');
  }

  const res = await fetch('https://api-auth.textup.uz/v1/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`TextUp.uz login xatosi: ${res.status}`);
  }

  const data = (await res.json()) as { accessToken?: string; user?: { id?: string } };
  const token = data?.accessToken;
  const userId = data?.user?.id;

  if (!token) {
    throw new Error('TextUp.uz tokenini olishda xato');
  }

  textupToken = token;
  if (userId) {
    textupUserId = userId;
  }
  // Token 25 daqiqa amal qiladi (xavfsizlik uchun erta yangilaymiz)
  textupTokenExpiry = Date.now() + 25 * 60 * 1000;

  return textupToken;
}

function getTextUpUserId(): string {
  // Avval env dan, keyin login javobidan
  const envUserId = process.env.TEXTUP_USER_ID;
  if (envUserId) return envUserId;
  if (textupUserId) return textupUserId;
  throw new Error('TEXTUP_USER_ID mavjud emas. Login qiling yoki env ga qo\'shing');
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

  const token = await getTextUpToken();
  const userId = getTextUpUserId();
  const templateId = process.env.TEXTUP_TEMPLATE_ID || '088b0e9d-5e05-45fa-b53f-6acdd7e05006';

  const message = `"Shok taksi" dasturiga kirish uchun tasdiqlash kodingiz: ${code}`;

  const smsRes = await fetch('https://sms-api.textup.uz/v1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      userId,
      templateId,
      recipients: [phone],
      name: `OTP-${phone}`,
    }),
  });

  if (!smsRes.ok) {
    // Token muddati o'tgan bo'lishi mumkin — bir marta qayta urinib ko'ramiz
    if (smsRes.status === 401) {
      textupToken = null;
      textupTokenExpiry = 0;
      const freshToken = await getTextUpToken();

      const retryRes = await fetch('https://sms-api.textup.uz/v1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
        },
        body: JSON.stringify({
          message,
          userId,
          templateId,
          recipients: [phone],
          name: `OTP-${phone}`,
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
