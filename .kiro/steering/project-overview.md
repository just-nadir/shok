---
inclusion: always
---

# Shok Taxi — Loyiha Umumiy Ma'lumoti

## Loyiha Maqsadi
Shok Taxi — haydovchilarni baholash uchun Progressive Web App (PWA). Mijozlar QR kod skanerlash yoki mashina raqami orqali haydovchini topib baholaydi. Haydovchilar o'z statistikasini ko'radi, adminlar esa haydovchilarni boshqaradi.

## Texnologiyalar

| Qatlam | Texnologiya |
|--------|-------------|
| Backend | Node.js, Express 4.x, TypeScript 5.5, PostgreSQL 16 |
| Frontend | React 18, React Router 6, Vite 5, Tailwind CSS 3 |
| Test | Vitest 2 (unit), Playwright 1.59 (E2E), fast-check (property-based) |
| Infra | Docker Compose, connect-pg-simple (session) |
| SMS | Eskiz.uz API (OTP) |

## Arxitektura
- Backend: Routes → Services → Database (pg pool)
- Frontend: Pages → Components → API service → Backend
- Offline: Service Worker + IndexedDB (Background Sync)
- Auth: Session-based (express-session + PostgreSQL store)

## Rollar
1. **Mijoz (Customer)** — OTP orqali telefon tasdiqlash, baholash qo'yish
2. **Haydovchi (Driver)** — mashina raqami + parol, o'z statistikasini ko'rish
3. **Admin** — username + parol, haydovchilarni boshqarish, CSV eksport

## API Prefikslari
- `/api/auth/*` — autentifikatsiya (OTP, login, logout)
- `/api/driver/*` — haydovchi ma'lumotlari (public)
- `/api/driver/me/*` — haydovchi paneli (authenticated)
- `/api/ratings` — baholash yuborish
- `/api/admin/*` — admin operatsiyalari

## Ma'lumotlar Bazasi Jadvallari
- `drivers` — haydovchilar profili
- `admins` — admin akkauntlari
- `ratings` — baholashlar (phone_hash bilan maxfiylik)
- `otp_codes` — OTP kodlar (5 daqiqa TTL)
- `login_attempts` — brute-force himoya
- `session` — express sessiyalar

## Muhit O'zgaruvchilari (backend/.env)
- `DATABASE_URL` yoki `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD`
- `SESSION_SECRET`
- `PORT` (default: 3000)
- `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`
- `BCRYPT_ROUNDS` (test: 1, production: 10)
