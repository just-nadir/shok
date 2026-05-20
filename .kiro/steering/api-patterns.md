---
inclusion: fileMatch
fileMatchPattern: "**/routes/**,**/services/api.ts,**/middleware/**"
---

# API Patterns va Qoidalar

## Backend Route Strukturasi
```
backend/src/routes/
├── auth.ts       — /api/auth/* (OTP, login, logout)
├── drivers.ts    — /api/driver/* (public haydovchi ma'lumotlari)
├── driverMe.ts   — /api/driver/me/* (haydovchi paneli, authenticated)
├── ratings.ts    — /api/ratings (baholash yuborish)
└── admin.ts      — /api/admin/* (admin operatsiyalari)
```

## Route Handler Pattern
```typescript
router.post('/endpoint', async (req: Request, res: Response): Promise<void> => {
  // 1. Input validatsiya
  const { field } = req.body as { field?: string };
  if (!field) {
    res.status(400).json({ error: 'Xato xabar', code: 'ERROR_CODE' });
    return;
  }

  // 2. Biznes logika
  try {
    const result = await someService(field);
    res.status(200).json(result);
  } catch {
    res.status(500).json({ error: 'Server xatosi', code: 'INTERNAL_ERROR' });
  }
});
```

## Xato Javob Formati
```json
{ "error": "O'zbek tilidagi xato xabar", "code": "SNAKE_CASE_CODE" }
```

## HTTP Status Kodlari
- `200` — muvaffaqiyat
- `201` — yaratildi
- `204` — content yo'q (logout)
- `400` — validatsiya xatosi
- `401` — autentifikatsiya kerak
- `403` — ruxsat yo'q
- `404` — topilmadi
- `409` — conflict (masalan, 24 soat ichida qayta baholash)
- `423` — rate limited (15 daqiqa blok)
- `500` — server xatosi

## Autentifikatsiya Middleware
- `requireDriver` — session.user.role === 'driver' tekshiradi
- `requireAdmin` — session.user.role === 'admin' tekshiradi
- `rateLimitMiddleware` — login urinishlarini cheklaydi

## Frontend API Service Pattern
```typescript
// frontend/src/services/api.ts
export function getDriverByQrCode(qrCode: string): Promise<Driver> {
  return request<Driver>(`/driver/${encodeURIComponent(qrCode)}`);
}
```

- Barcha API chaqiruvlari `request<T>()` wrapper orqali
- `credentials: 'include'` — cookie'lar yuboriladi
- Xato: `ApiError` class (status + message)
- Base URL: `VITE_API_URL` yoki `/api` (default)

## Rate Limiting
- Identifikator: `phone` yoki `username` (req.body dan)
- Limit: 5 urinish / 15 daqiqa
- Muvaffaqiyatli logindan keyin: `clearAttempts()` chaqiriladi
- Javob: `423 { error: "Juda ko'p urinish...", code: "RATE_LIMITED" }`
