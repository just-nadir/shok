---
inclusion: always
---

# Test Yozish Qo'llanmasi

## Test Frameworklari
- **Backend unit testlar**: Vitest (node environment, 120s timeout)
- **Frontend unit testlar**: Vitest (jsdom environment) + @testing-library/react
- **E2E testlar**: Playwright (Chromium)
- **Property-based testlar**: fast-check

## Buyruqlar
```bash
# Backend testlar
cd backend && npm test          # vitest --run
cd backend && npm run test:watch # vitest (watch mode)

# Frontend unit testlar
cd frontend && npm test          # vitest --run
cd frontend && npm run test:watch # vitest (watch mode)

# E2E testlar
cd frontend && npm run test:e2e     # playwright test
cd frontend && npm run test:e2e:ui  # playwright UI mode
```

## Test Fayl Joylashuvi
- Backend: `backend/src/**/*.test.ts` (test fayli manba fayl yonida)
- Frontend unit: `frontend/src/**/*.test.tsx`
- Frontend E2E: `frontend/e2e/*.spec.ts`

## Backend Test Qoidalari
- Database query'larni `vi.mock('../db/pool')` bilan mock qilish
- `BCRYPT_ROUNDS=1` test muhitida (tezlik uchun)
- Property-based test: `fc.assert(fc.property(...))` pattern
- Async operatsiyalar uchun `await` ishlatish

## Frontend Test Qoidalari
- Komponent testlari: `render()` + `screen.getBy*` + `userEvent`
- API mock: `vi.mock('../services/api')`
- IndexedDB mock: `fake-indexeddb` yoki manual mock
- Setup fayli: `frontend/src/test/setup.ts`

## E2E Test Qoidalari
- Base URL: `http://localhost:5173`
- Playwright config: `frontend/playwright.config.ts`
- Test fayllar: `customer-flow`, `driver-flow`, `admin-flow`, `offline-flow`
- `page.goto()`, `page.fill()`, `page.click()`, `expect(page)` pattern

## Test Yozish Namunasi (Backend)
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { query } from '../db/pool';

vi.mock('../db/pool', () => ({
  query: vi.fn(),
}));

describe('myFunction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should do something', async () => {
    (query as any).mockResolvedValueOnce({ rows: [{ count: '0' }] });
    const result = await myFunction('test');
    expect(result).toBe(false);
  });
});
```
