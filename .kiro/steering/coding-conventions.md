---
inclusion: always
---

# Kod Yozish Qoidalari

## TypeScript Konfiguratsiyasi
- `strict: true` — har doim
- `noUnusedLocals: true`, `noUnusedParameters: true`
- Backend: CommonJS module, ES2020 target
- Frontend: ESNext module, JSX react-jsx

## Nomlash Konventsiyalari
- **Backend o'zgaruvchilar/funksiyalar**: camelCase (`sendOTP`, `isBlocked`)
- **Database ustunlari**: snake_case (`car_number`, `phone_hash`, `created_at`)
- **Frontend komponentlar**: PascalCase (`StarRating`, `OfflineBanner`)
- **Frontend funksiyalar/hooks**: camelCase (`saveOfflineRating`, `useEffect`)
- **API yo'llari**: kebab-case (`/send-otp`, `/verify-otp`)
- **Fayl nomlari**: komponentlar PascalCase (`RatingForm.tsx`), servislar camelCase (`otpService.ts`)

## Til va Lokalizatsiya
- UI matnlari va xato xabarlari **o'zbek tilida** yoziladi
- Kod ichidagi izohlar o'zbek tilida
- API javoblaridagi `error` maydoni o'zbek tilida

## Backend Qoidalari
- Har bir route handler `async (req: Request, res: Response): Promise<void>` tipida
- SQL so'rovlar **parameterized** bo'lishi shart (`$1, $2` placeholder)
- Parollar faqat `bcrypt` bilan hash qilinadi (SALT_ROUNDS = 10)
- Telefon raqamlari `ratings` jadvalida hash qilinadi (maxfiylik)
- Xato javoblar: `{ error: string, code: string }` formatida
- Rate limiting: 5 urinish → 15 daqiqa blok

## Frontend Qoidalari
- Funksional komponentlar + React hooks
- Lazy loading (`React.lazy`) barcha sahifalar uchun
- Tailwind CSS utility class'lari (inline styles yo'q)
- API chaqiruvlari faqat `frontend/src/services/api.ts` orqali
- Offline qo'llab-quvvatlash: IndexedDB (`offlineQueue.ts`)
- `ProtectedRoute` komponenti autentifikatsiya tekshiradi

## Import Tartibi
1. Tashqi kutubxonalar (`react`, `express`, `bcrypt`)
2. Ichki modullar (`../services/`, `../db/`)
3. Tiplar (`../types/index`)

## Xavfsizlik
- `httpOnly: true` cookie'lar
- CORS faqat ishonchli domenlar uchun
- Input validatsiya (`validators/` papkasi)
- Session secret `.env` dan olinadi
