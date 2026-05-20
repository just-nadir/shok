import * as crypto from 'crypto';

const TELEGRAM_JWKS_URL = 'https://oauth.telegram.org/.well-known/jwks.json';
const TELEGRAM_ISSUER = 'https://oauth.telegram.org';

interface JWK {
  kty: string;
  kid: string;
  n: string;
  e: string;
  alg: string;
  use: string;
}

interface JWKSResponse {
  keys: JWK[];
}

interface TelegramIdToken {
  iss: string;
  aud: string;
  sub: string;
  iat: number;
  exp: number;
  id: number;
  name?: string;
  preferred_username?: string;
  picture?: string;
  phone_number?: string;
}

// JWKS cache
let jwksCache: JWK[] | null = null;
let jwksCacheExpiry = 0;

async function getJWKS(): Promise<JWK[]> {
  if (jwksCache && Date.now() < jwksCacheExpiry) {
    return jwksCache;
  }

  const res = await fetch(TELEGRAM_JWKS_URL);
  if (!res.ok) {
    throw new Error(`JWKS olishda xato: ${res.status}`);
  }

  const data = (await res.json()) as JWKSResponse;
  jwksCache = data.keys;
  jwksCacheExpiry = Date.now() + 60 * 60 * 1000; // 1 soat cache
  return jwksCache;
}

function base64UrlDecode(str: string): Buffer {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64');
}

function jwkToPublicKey(jwk: JWK): crypto.KeyObject {
  const key = crypto.createPublicKey({
    key: {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
    },
    format: 'jwk',
  });
  return key;
}

/**
 * Telegram id_token ni verify qiladi va payload qaytaradi.
 */
export async function verifyTelegramIdToken(idToken: string): Promise<TelegramIdToken> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Yaroqsiz token formati');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Header'dan kid olish
  const header = JSON.parse(base64UrlDecode(headerB64).toString()) as { kid?: string; alg?: string };

  if (!header.kid) {
    throw new Error('Token header da kid yo\'q');
  }

  // JWKS dan mos kalitni topish
  const keys = await getJWKS();
  const jwk = keys.find(k => k.kid === header.kid);

  if (!jwk) {
    throw new Error('Mos kalit topilmadi');
  }

  // Imzoni tekshirish
  const publicKey = jwkToPublicKey(jwk);
  const signedData = `${headerB64}.${payloadB64}`;
  const signature = base64UrlDecode(signatureB64);

  const isValid = crypto.verify(
    'sha256',
    Buffer.from(signedData),
    publicKey,
    signature
  );

  if (!isValid) {
    throw new Error('Token imzosi yaroqsiz');
  }

  // Payload'ni decode qilish
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString()) as TelegramIdToken;

  // Claims tekshirish
  const botId = process.env.TELEGRAM_CLIENT_ID;
  if (!botId) {
    throw new Error('TELEGRAM_CLIENT_ID muhit o\'zgaruvchisi kerak');
  }

  if (payload.iss !== TELEGRAM_ISSUER) {
    throw new Error('Token issuer noto\'g\'ri');
  }

  if (payload.aud !== botId) {
    throw new Error('Token audience noto\'g\'ri');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token muddati o\'tgan');
  }

  return payload;
}
