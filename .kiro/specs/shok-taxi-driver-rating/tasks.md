# Amalga Oshirish Rejasi: Shok Taksi Haydovchi Baholash PWA

## Umumiy Ko'rinish

React 18 + TypeScript (frontend) va Node.js + Express.js + TypeScript (backend) asosida PostgreSQL ma'lumotlar bazasi bilan haydovchi baholash tizimini bosqichma-bosqich amalga oshirish. Har bir qadam oldingi qadamga tayanadi va oxirida barcha qismlar birlashtiriladi.

## Vazifalar

- [x] 1. Loyiha tuzilmasini va asosiy interfeyslari sozlash
  - Frontend: `src/types/index.ts` faylida `Driver`, `RatingRequest`, `DriverStats`, `DriverRatingView`, `OfflineRating` TypeScript interfeyslarini yaratish
  - Backend: `src/types/index.ts` faylida umumiy tip ta'riflarini yaratish
  - Vitest va fast-check test muhitini sozlash (`vitest.config.ts`)
  - _Talablar: 1.1, 2.3, 3.3, 6.2_

- [ ] 2. Ma'lumotlar bazasi va migratsiyalarni sozlash
  - [x] 2.1 PostgreSQL jadvallarini yaratuvchi migratsiya skriptlarini yozish
    - `drivers`, `admins`, `ratings`, `otp_codes`, `login_attempts`, `session` jadvallarini yaratish
    - `db/migrations/001_initial.sql` faylini yaratish
    - _Talablar: 1.1, 2.3, 3.3, 9.2_
  - [x] 2.2 Ma'lumotlar bazasi ulanish modulini yozish (`src/db/pool.ts`)
    - `pg` kutubxonasi bilan connection pool sozlash
    - _Talablar: 5.1_

- [x] 3. Backend autentifikatsiya tizimini amalga oshirish
  - [x] 3.1 SMS OTP xizmatini yozish (`src/services/otpService.ts`)
    - OTP generatsiya, bcrypt hash, Eskiz.uz API integratsiyasi
    - 5 daqiqalik muddati va `used` flag boshqaruvi
    - _Talablar: 9 (OTP autentifikatsiya)_
  - [x] 3.2 OTP round-trip xossa testi yozish (fast-check)
    - **Xossa 8: OTP round-trip — to'g'ri kod sessiya yaratadi, noto'g'ri/muddati o'tgan kod yaratmaydi**
    - **Tasdiqlaydi: Talab 9 (OTP autentifikatsiya)**
  - [x] 3.3 Brute-force himoya middleware yozish (`src/middleware/rateLimiter.ts`)
    - `login_attempts` jadvalidan foydalanib 5 urinish / 15 daqiqa blok logikasi
    - _Talablar: 9.3_
  - [x] 3.4 Brute-force himoya xossa testi yozish (fast-check)
    - **Xossa 7: Tasodifiy identifikator uchun 5 urinishdan so'ng bloklanadi**
    - **Tasdiqlaydi: Talab 9.3**
  - [x] 3.5 Auth endpointlarini yozish (`src/routes/auth.ts`)
    - `POST /api/auth/send-otp`, `POST /api/auth/verify-otp`, `POST /api/auth/driver/login`, `POST /api/auth/logout`
    - `express-session` + `connect-pg-simple` sessiya boshqaruvi
    - _Talablar: 9.1, 9.2, 9.3_

- [x] 4. Nazorat punkti — Autentifikatsiya testlarini tekshirish
  - Barcha testlar o'tishini tekshiring, savollar bo'lsa foydalanuvchiga murojaat qiling.

- [x] 5. Haydovchi va baholash API endpointlarini amalga oshirish
  - [x] 5.1 Baholash validatsiya funksiyalarini yozish (`src/validators/ratingValidator.ts`)
    - `overallRating` 1–5 oraliq tekshiruvi
    - Kategoriya qiymatlari `'good'|'average'|'bad'` tekshiruvi
    - Izoh 500 belgi cheklovi
    - _Talablar: 2.3, 3.3, 4.2, 4.3_
  - [x] 5.2 Yulduz reytingi chegarasi xossa testi yozish (fast-check)
    - **Xossa 1: Tasodifiy butun sonlar uchun 1–5 dan tashqarilar rad etiladi**
    - **Tasdiqlaydi: Talab 2.3**
  - [x] 5.3 Izoh uzunligi cheklovi xossa testi yozish (fast-check)
    - **Xossa 2: Tasodifiy uzunlikdagi matnlar uchun >500 rad etiladi, ≤500 qabul qilinadi**
    - **Tasdiqlaydi: Talab 4.2, 4.3**
  - [x] 5.4 Kategoriya bahosi validatsiyasi xossa testi yozish (fast-check)
    - **Xossa 9: Tasodifiy kategoriya qiymatlari uchun faqat 3 ta qabul qilinadi**
    - **Tasdiqlaydi: Talab 3.3**
  - [x] 5.5 Ommaviy haydovchi va baholash endpointlarini yozish (`src/routes/ratings.ts`, `src/routes/drivers.ts`)
    - `GET /api/driver/:qrCode` — QR kod bo'yicha haydovchi ma'lumotlari
    - `POST /api/ratings` — yangi baholash yuborish (bloklangan haydovchi tekshiruvi, 24 soat bloki)
    - _Talablar: 1.2, 1.3, 5.1, 5.4, 7.6_
  - [x] 5.6 24 soatlik qayta baholash bloki xossa testi yozish (fast-check)
    - **Xossa 3: Tasodifiy telefon + QR juftligi uchun 24 soat ichida ikkinchi baholash rad etiladi**
    - **Tasdiqlaydi: Talab 5.4**
  - [x] 5.7 Bloklangan haydovchi xossa testi yozish (fast-check)
    - **Xossa 6: Bloklangan haydovchi uchun har qanday QR so'rovi rad etiladi**
    - **Tasdiqlaydi: Talab 7.6**

- [x] 6. Haydovchi va admin panel endpointlarini amalga oshirish
  - [x] 6.1 Haydovchi panel endpointlarini yozish (`src/routes/driverMe.ts`)
    - `GET /api/driver/me/stats` — o'rtacha reyting, jami, 30 kunlik tendensiya
    - `GET /api/driver/me/ratings` — so'nggi 20 ta baholash (maxfiy: faqat oy/yil)
    - Auth middleware: faqat o'z ma'lumotlari
    - _Talablar: 6.2, 6.3, 6.4, 6.5_
  - [x] 6.2 Haydovchi izolyatsiyasi xossa testi yozish (fast-check)
    - **Xossa 5: Tasodifiy haydovchi ID uchun faqat o'z ma'lumotlari qaytadi**
    - **Tasdiqlaydi: Talab 6.5**
  - [x] 6.3 Admin panel endpointlarini yozish (`src/routes/admin.ts`)
    - `GET /api/admin/drivers`, `GET /api/admin/drivers/:id/ratings`
    - `GET /api/admin/ratings` (sana filtri), `GET /api/admin/ratings/export` (CSV)
    - `POST /api/admin/drivers/:id/block`, `GET /api/admin/qr/:driverId`
    - _Talablar: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - [x] 6.4 CSV eksport va QR generatsiya unit testlarini yozish (Vitest)
    - CSV format to'g'riligini tekshirish
    - QR kod noyobligini tekshirish
    - _Talablar: 7.5, 1.1_

- [x] 7. Nazorat punkti — Backend API testlarini tekshirish
  - Barcha testlar o'tishini tekshiring, savollar bo'lsa foydalanuvchiga murojaat qiling.

- [x] 8. Frontend asosiy tuzilmasini yaratish
  - [x] 8.1 Vite + React 18 + TypeScript + Tailwind CSS loyiha tuzilmasini sozlash
    - `src/pages/`, `src/components/`, `src/hooks/`, `src/services/` papkalarini yaratish
    - React Router v6 marshrutlarini sozlash (`App.tsx`)
    - _Talablar: 8.1, 8.5_
  - [x] 8.2 API mijoz xizmatini yozish (`src/services/api.ts`)
    - Barcha backend endpointlari uchun `fetch` wrapper funksiyalari
    - Xato boshqaruvi va HTTP status kodlari
    - _Talablar: 5.1, 5.2_

- [x] 9. Baholash oqimini (mijoz) amalga oshirish
  - [x] 9.1 QR skaner sahifasini yaratish (`src/pages/QRScanner.tsx`)
    - `html5-qrcode` yoki `jsQR` kutubxonasi bilan kamera integratsiyasi
    - Kamera ruxsati so'rash va xato holatlari
    - _Talablar: 1.2, 1.3, 1.4, 1.5_
  - [x] 9.2 OTP tasdiqlash sahifasini yaratish (`src/pages/OTPVerify.tsx`)
    - Telefon raqami kiritish va OTP yuborish
    - OTP kodi kiritish va tasdiqlash
    - _Talablar: 9 (OTP autentifikatsiya)_
  - [x] 9.3 Baholash formasini yaratish (`src/pages/RatingForm.tsx`)
    - 5 ta interaktiv yulduz komponenti (`src/components/StarRating.tsx`)
    - 4 ta kategoriya komponenti (`src/components/CategoryRating.tsx`) — `good/average/bad`
    - Ixtiyoriy izoh maydoni (500 belgi cheklovi, qolgan belgilar hisoblagichi)
    - Yuborish tugmasi va validatsiya xabarlari
    - _Talablar: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2_
  - [x] 9.4 Baholash formasi unit testlarini yozish (Vitest)
    - Yulduz tanlash, kategoriya tanlash, izoh cheklovi
    - Validatsiya xabarlari
    - _Talablar: 2.4, 4.2_

- [x] 10. Haydovchi panelini amalga oshirish
  - [x] 10.1 Haydovchi login sahifasini yaratish (`src/pages/DriverLogin.tsx`)
    - Login/parol formasi va xato boshqaruvi
    - _Talablar: 6.1_
  - [x] 10.2 Haydovchi paneli sahifasini yaratish (`src/pages/DriverDashboard.tsx`)
    - Statistika kartasi (o'rtacha reyting, jami, 30 kunlik tendensiya)
    - Kategoriya o'rtachalari
    - So'nggi 20 ta baholash ro'yxati (oy/yil bilan, aniq sana ko'rsatilmaydi)
    - _Talablar: 6.2, 6.3, 6.4, 6.5_

- [x] 11. Admin panelini amalga oshirish
  - [x] 11.1 Admin login sahifasini yaratish (`src/pages/AdminLogin.tsx`)
    - _Talablar: 7.1_
  - [x] 11.2 Admin paneli sahifasini yaratish (`src/pages/AdminDashboard.tsx`)
    - Haydovchilar ro'yxati va o'rtacha reytinglari
    - Sana oralig'i filtri
    - CSV eksport tugmasi
    - Haydovchini bloklash tugmasi
    - _Talablar: 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 12. Nazorat punkti — Frontend sahifalar testlarini tekshirish
  - Barcha testlar o'tishini tekshiring, savollar bo'lsa foydalanuvchiga murojaat qiling.

- [x] 13. PWA va oflayn funksionalligini amalga oshirish
  - [x] 13.1 Web App Manifest faylini yaratish (`public/manifest.json`)
    - Ilova nomi, ikonkalar, `display: standalone`, `theme_color`
    - _Talablar: 8.2_
  - [x] 13.2 Service Worker yozish (`public/sw.js`)
    - Asosiy sahifalar va resurslarni keshlash (Cache-first strategiya)
    - Background Sync orqali oflayn baholashlarni yuborish
    - _Talablar: 8.3, 8.4_
  - [x] 13.3 IndexedDB oflayn navbat xizmatini yozish (`src/services/offlineQueue.ts`)
    - `OfflineRating` elementlarini saqlash, o'qish, o'chirish
    - `synced` flag boshqaruvi
    - _Talablar: 5.3, 8.4_
  - [x] 13.4 Oflayn baholash sinxronizatsiyasi xossa testi yozish (fast-check)
    - **Xossa 4: Tasodifiy baholashlar oflayn saqlanganda yo'qolmaydi va sinxronizatsiyadan so'ng navbatdan o'chiriladi**
    - **Tasdiqlaydi: Talab 5.3, 8.4**
  - [x] 13.5 Oflayn holat UI komponentini yaratish (`src/components/OfflineBanner.tsx`)
    - Tarmoq holati o'zgarishini kuzatish va banner ko'rsatish
    - _Talablar: 5.3_

- [x] 14. Barcha qismlarni birlashtirish va sozlash
  - [x] 14.1 Frontend marshrutlarini himoya qilish (`src/components/ProtectedRoute.tsx`)
    - Haydovchi va admin uchun autentifikatsiya tekshiruvi
    - Sessiya muddati o'tganda login sahifasiga yo'naltirish
    - _Talablar: 6.1, 7.1, 9.4, 9.5_
  - [x] 14.2 Xato boshqaruvi komponentlarini yaratish (`src/components/ErrorBoundary.tsx`)
    - Foydalanuvchiga qulay xato xabarlari (dizayn hujjatidagi xato jadvali asosida)
    - _Talablar: 1.3, 5.4, 5.5_
  - [x] 14.3 Responsive dizaynni tekshirish va sozlash
    - 320px dan 1440px gacha barcha ekran o'lchamlarida to'g'ri ko'rinish
    - _Talablar: 8.5_

- [x] 15. E2E testlarini yozish (Playwright)
  - [x] 15.1 Mijoz oqimi E2E testini yozish
    - QR skanerlash → OTP tasdiqlash → baholash yuborish → tasdiqlash xabari
    - _Talablar: 1.4, 5.1, 5.2_
  - [x] 15.2 Haydovchi oqimi E2E testini yozish
    - Login → panel ko'rish → statistika va baholashlar
    - _Talablar: 6.1, 6.2, 6.3, 6.4_
  - [x] 15.3 Admin oqimi E2E testini yozish
    - Login → filtrlash → CSV eksport → haydovchini bloklash
    - _Talablar: 7.1, 7.4, 7.5, 7.6_
  - [x] 15.4 Oflayn oqimi E2E testini yozish
    - Oflayn baholash saqlash → aloqa tiklash → sinxronizatsiya
    - _Talablar: 5.3, 8.4_

- [x] 16. Yakuniy nazorat punkti — Barcha testlarni tekshirish
  - Barcha testlar o'tishini tekshiring, savollar bo'lsa foydalanuvchiga murojaat qiling.

## Eslatmalar

- `*` bilan belgilangan vazifalar ixtiyoriy bo'lib, tezroq MVP uchun o'tkazib yuborilishi mumkin
- Har bir vazifa aniq talablarga havola qiladi (kuzatish uchun)
- Nazorat punktlari bosqichma-bosqich tekshirishni ta'minlaydi
- Xossa testlari universal to'g'rilikni, unit testlar esa aniq misollarni tekshiradi
- fast-check testlari kamida 100 iteratsiya bilan ishga tushirilishi kerak
- Har bir fast-check testi `// Feature: shok-taxi-driver-rating, Property N: <xossa matni>` formatida belgilanishi kerak
