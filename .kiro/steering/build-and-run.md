---
inclusion: always
---

# Build va Ishga Tushirish

## Tizim Talablari
- Node.js (ES2020 qo'llab-quvvatlash)
- Docker va Docker Compose (PostgreSQL uchun)
- npm (paket menejeri)

## Dastlabki Sozlash

### 1. Database ishga tushirish
```bash
docker-compose up -d
```
Bu PostgreSQL 16 ni `localhost:5432` da ishga tushiradi. Migratsiyalar avtomatik bajariladi (`001_initial.sql`).

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env  # yoki mavjud .env ni sozlash
npm run dev           # ts-node-dev bilan ishga tushadi (port 3000)
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev           # Vite dev server (port 5173, API proxy → localhost:3000)
```

### 4. Admin yaratish
```bash
cd backend
npx ts-node scripts/create-admin.ts
```

## Build (Production)
```bash
# Backend
cd backend && npm run build    # → dist/ papkasiga kompilatsiya
cd backend && npm start        # dist/index.js ni ishga tushiradi

# Frontend
cd frontend && npm run build   # → dist/ papkasiga build
cd frontend && npm run preview # production build preview
```

## Muhim Portlar
| Servis | Port |
|--------|------|
| Frontend (dev) | 5173 |
| Backend | 3000 |
| PostgreSQL | 5432 |

## Vite Proxy Konfiguratsiyasi
Frontend dev serverda `/api` so'rovlari avtomatik `http://localhost:3000` ga proxy qilinadi.

## Docker Compose Servislari
- `postgres` — PostgreSQL 16 Alpine
  - DB: `shok_taxi`
  - User: `postgres`
  - Volumes: `postgres_data` (persistent)

## Migratsiyalar
- `backend/db/migrations/001_initial.sql` — asosiy schema
- `backend/db/migrations/002_driver_phone.sql` — haydovchi telefon ustuni
- Yangi migratsiya: `backend/db/migrations/XXX_description.sql` formatida
