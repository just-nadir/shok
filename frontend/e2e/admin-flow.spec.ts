/**
 * E2E: Admin oqimi — Login → filtrlash → CSV eksport → haydovchini bloklash
 * Validates: Requirements 7.1, 7.4, 7.5, 7.6
 */
import { test, expect } from '@playwright/test';

const MOCK_DRIVERS = [
  {
    id: 'driver-1',
    fullName: 'Alisher Karimov',
    carNumber: '01A123BC',
    isBlocked: false,
  },
  {
    id: 'driver-2',
    fullName: 'Bobur Toshmatov',
    carNumber: '10B456DE',
    isBlocked: false,
  },
  {
    id: 'driver-3',
    fullName: 'Jasur Yusupov',
    carNumber: '30C789FG',
    isBlocked: true,
  },
];

const MOCK_RATINGS = [
  {
    id: 'rating-1',
    overallRating: 5,
    cleanliness: 'good',
    politeness: 'good',
    drivingStyle: 'good',
    punctuality: 'good',
    comment: 'Ajoyib haydovchi!',
    monthYear: '2025-01',
  },
  {
    id: 'rating-2',
    overallRating: 3,
    cleanliness: 'average',
    politeness: 'good',
    drivingStyle: 'bad',
    punctuality: 'average',
    comment: '',
    monthYear: '2025-01',
  },
];

const MOCK_AUTH_ME = {
  role: 'admin',
  userId: 'admin-1',
};

const CSV_CONTENT = 'id,driverId,overallRating,cleanliness,politeness,drivingStyle,punctuality,comment,createdAt\nrating-1,driver-1,5,good,good,good,good,Ajoyib haydovchi!,2025-01-15\n';

test.describe('Admin oqimi', () => {
  test.describe('Login va dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/auth/admin/login', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Muvaffaqiyatli kirildi' }),
        });
      });

      await page.route('**/api/auth/me', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_AUTH_ME),
        });
      });

      await page.route('**/api/admin/drivers', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DRIVERS),
        });
      });

      await page.route('**/api/admin/ratings**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RATINGS),
        });
      });

      await page.route('**/api/admin/ratings/export', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: CSV_CONTENT,
        });
      });

      await page.route('**/api/admin/drivers/*/block', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Haydovchi bloklandi' }),
        });
      });
    });

    test('1. Admin login sahifasi to\'g\'ri ko\'rinishi — Req 7.1', async ({ page }) => {
      await page.goto('/admin/login');
      await expect(page).toHaveURL('/admin/login');
      await expect(page.getByText('Admin Paneli')).toBeVisible();
      await expect(page.getByPlaceholder('Loginni kiriting')).toBeVisible();
      await expect(page.getByPlaceholder('Parolni kiriting')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Kirish' })).toBeVisible();
    });

    test('2. Login → /admin/dashboard ga yo\'naltirish — Req 7.1', async ({ page }) => {
      await page.goto('/admin/login');

      await page.getByPlaceholder('Loginni kiriting').fill('admin');
      await page.getByPlaceholder('Parolni kiriting').fill('admin123');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page).toHaveURL('/admin/dashboard', { timeout: 5000 });
    });

    test('3. Dashboard: haydovchilar ro\'yxati ko\'rinishi — Req 7.2', async ({ page }) => {
      await page.goto('/admin/login');
      await page.getByPlaceholder('Loginni kiriting').fill('admin');
      await page.getByPlaceholder('Parolni kiriting').fill('admin123');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page).toHaveURL('/admin/dashboard', { timeout: 5000 });

      // Haydovchilar ro'yxati ko'rinishi
      await expect(page.getByText('Alisher Karimov')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('01A123BC')).toBeVisible();
      await expect(page.getByText('Bobur Toshmatov')).toBeVisible();
      await expect(page.getByText('10B456DE')).toBeVisible();
    });

    test('4. Bloklangan haydovchi belgisi ko\'rinishi — Req 7.6', async ({ page }) => {
      await page.goto('/admin/login');
      await page.getByPlaceholder('Loginni kiriting').fill('admin');
      await page.getByPlaceholder('Parolni kiriting').fill('admin123');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page).toHaveURL('/admin/dashboard', { timeout: 5000 });

      // Bloklangan haydovchi uchun "Bloklangan" belgisi
      await expect(page.getByText('Jasur Yusupov')).toBeVisible({ timeout: 5000 });
      const blockedBadges = page.getByText('Bloklangan');
      await expect(blockedBadges.first()).toBeVisible();
    });
  });

  test.describe('Sana oralig\'i bo\'yicha filtrlash — Req 7.4', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/auth/admin/login', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Muvaffaqiyatli kirildi' }),
        });
      });

      await page.route('**/api/admin/drivers', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DRIVERS),
        });
      });

      await page.route('**/api/admin/ratings**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RATINGS),
        });
      });
    });

    test('5. Sana oralig\'i filtri va natijalar ko\'rinishi — Req 7.4', async ({ page }) => {
      await page.goto('/admin/login');
      await page.getByPlaceholder('Loginni kiriting').fill('admin');
      await page.getByPlaceholder('Parolni kiriting').fill('admin123');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page).toHaveURL('/admin/dashboard', { timeout: 5000 });

      // Baholashlar tabiga o'tish
      await page.getByRole('button', { name: 'Baholashlar' }).click();

      // Sana kiritish maydonlari ko'rinishi
      await expect(page.getByLabel('Dan')).toBeVisible({ timeout: 3000 });
      await expect(page.getByLabel('Gacha')).toBeVisible();

      // Sana oralig'ini to'ldirish
      await page.getByLabel('Dan').fill('2025-01-01');
      await page.getByLabel('Gacha').fill('2025-01-31');

      // Filtrlash tugmasini bosish
      await page.getByRole('button', { name: 'Filtrlash' }).click();

      // Natijalar ko'rinishi
      await expect(page.getByText('2 ta baholash topildi')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Ajoyib haydovchi!')).toBeVisible();
    });

    test('6. Faqat "Dan" sanasi bilan filtrlash — Req 7.4', async ({ page }) => {
      await page.goto('/admin/login');
      await page.getByPlaceholder('Loginni kiriting').fill('admin');
      await page.getByPlaceholder('Parolni kiriting').fill('admin123');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page).toHaveURL('/admin/dashboard', { timeout: 5000 });

      await page.getByRole('button', { name: 'Baholashlar' }).click();

      await page.getByLabel('Dan').fill('2025-01-01');
      await page.getByRole('button', { name: 'Filtrlash' }).click();

      await expect(page.getByText('2 ta baholash topildi')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('CSV eksport — Req 7.5', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/auth/admin/login', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Muvaffaqiyatli kirildi' }),
        });
      });

      await page.route('**/api/admin/drivers', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DRIVERS),
        });
      });

      await page.route('**/api/admin/ratings/export', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: CSV_CONTENT,
        });
      });
    });

    test('7. CSV eksport tugmasi yuklab olishni boshlaydi — Req 7.5', async ({ page }) => {
      await page.goto('/admin/login');
      await page.getByPlaceholder('Loginni kiriting').fill('admin');
      await page.getByPlaceholder('Parolni kiriting').fill('admin123');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page).toHaveURL('/admin/dashboard', { timeout: 5000 });

      // Yuklab olish hodisasini kuzatish
      const downloadPromise = page.waitForEvent('download');

      // CSV Eksport tugmasini bosish
      await page.getByRole('button', { name: /Eksport/i }).click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('ratings.csv');
    });
  });

  test.describe('Haydovchini bloklash — Req 7.6', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/auth/admin/login', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Muvaffaqiyatli kirildi' }),
        });
      });

      await page.route('**/api/admin/drivers', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DRIVERS),
        });
      });

      await page.route('**/api/admin/drivers/*/block', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Haydovchi bloklandi' }),
        });
      });
    });

    test('8. Haydovchini bloklash tugmasi ko\'rinishi va ishlashi — Req 7.6', async ({ page }) => {
      // Bloklashdan keyin yangilangan ro'yxat uchun mock
      let blockCalled = false;
      await page.route('**/api/admin/drivers', (route) => {
        if (blockCalled) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { ...MOCK_DRIVERS[0], isBlocked: true },
              MOCK_DRIVERS[1],
              MOCK_DRIVERS[2],
            ]),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_DRIVERS),
          });
        }
      });

      await page.route('**/api/admin/drivers/driver-1/block', (route) => {
        blockCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Haydovchi bloklandi' }),
        });
      });

      await page.goto('/admin/login');
      await page.getByPlaceholder('Loginni kiriting').fill('admin');
      await page.getByPlaceholder('Parolni kiriting').fill('admin123');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page).toHaveURL('/admin/dashboard', { timeout: 5000 });
      await expect(page.getByText('Alisher Karimov')).toBeVisible({ timeout: 5000 });

      // Birinchi haydovchi uchun "Bloklash" tugmasini topish va bosish
      const driverRow = page.locator('div').filter({ hasText: 'Alisher Karimov' }).first();
      const blockBtn = driverRow.getByRole('button', { name: 'Bloklash' });
      await expect(blockBtn).toBeVisible();
      await blockBtn.click();

      // Bloklangandan keyin "Bloklangan" holati ko'rinishi
      await expect(page.getByText('Bloklangan').first()).toBeVisible({ timeout: 5000 });
    });

    test('9. Allaqachon bloklangan haydovchi uchun tugma o\'chirilgan — Req 7.6', async ({ page }) => {
      await page.goto('/admin/login');
      await page.getByPlaceholder('Loginni kiriting').fill('admin');
      await page.getByPlaceholder('Parolni kiriting').fill('admin123');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page).toHaveURL('/admin/dashboard', { timeout: 5000 });
      await expect(page.getByText('Jasur Yusupov')).toBeVisible({ timeout: 5000 });

      // Bloklangan haydovchi uchun tugma disabled bo'lishi kerak
      const jasurRow = page.locator('div').filter({ hasText: 'Jasur Yusupov' }).first();
      const blockedBtn = jasurRow.getByRole('button', { name: 'Bloklangan' });
      await expect(blockedBtn).toBeDisabled();
    });
  });

  test.describe('Autentifikatsiya himoyasi — Req 7.1', () => {
    test('10. Autentifikatsiyasiz /admin/dashboard ga kirish /admin/login ga yo\'naltiradi', async ({ page }) => {
      // 401 qaytaruvchi mock
      await page.route('**/api/admin/drivers', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      });

      await page.goto('/admin/dashboard');

      // 401 xatosi tufayli login sahifasiga yo'naltirilishi kerak
      await expect(page).toHaveURL('/admin/login', { timeout: 5000 });
    });

    test('11. Noto\'g\'ri login ma\'lumotlari xato xabarini ko\'rsatadi — Req 7.1', async ({ page }) => {
      await page.route('**/api/auth/admin/login', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: "Login yoki parol noto'g'ri" }),
        });
      });

      await page.goto('/admin/login');
      await page.getByPlaceholder('Loginni kiriting').fill('wrongadmin');
      await page.getByPlaceholder('Parolni kiriting').fill('wrongpass');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page.getByText("Login yoki parol noto'g'ri")).toBeVisible({ timeout: 5000 });
      await expect(page).toHaveURL('/admin/login');
    });

    test('12. Bo\'sh maydonlar bilan yuborishda validatsiya xabari', async ({ page }) => {
      await page.goto('/admin/login');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page.getByText('Login va parolni kiriting')).toBeVisible();
      await expect(page).toHaveURL('/admin/login');
    });
  });

  test.describe('To\'liq admin oqimi — Req 7.1, 7.4, 7.5, 7.6', () => {
    test('13. Login → haydovchilar ro\'yxati → filtrlash → CSV eksport → bloklash', async ({ page }) => {
      // Barcha API mock'larini sozlash
      await page.route('**/api/auth/admin/login', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Muvaffaqiyatli kirildi' }),
        });
      });

      await page.route('**/api/admin/drivers', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_DRIVERS),
        });
      });

      await page.route('**/api/admin/ratings**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RATINGS),
        });
      });

      await page.route('**/api/admin/ratings/export', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: CSV_CONTENT,
        });
      });

      await page.route('**/api/admin/drivers/*/block', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Haydovchi bloklandi' }),
        });
      });

      // 1. Login — Req 7.1
      await page.goto('/admin/login');
      await page.getByPlaceholder('Loginni kiriting').fill('admin');
      await page.getByPlaceholder('Parolni kiriting').fill('admin123');
      await page.getByRole('button', { name: 'Kirish' }).click();
      await expect(page).toHaveURL('/admin/dashboard', { timeout: 5000 });

      // 2. Haydovchilar ro'yxati ko'rinishi
      await expect(page.getByText('Alisher Karimov')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Bobur Toshmatov')).toBeVisible();

      // 3. CSV eksport — Req 7.5
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /Eksport/i }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('ratings.csv');

      // 4. Baholashlar tabiga o'tish va filtrlash — Req 7.4
      await page.getByRole('button', { name: 'Baholashlar' }).click();
      await page.getByLabel('Dan').fill('2025-01-01');
      await page.getByLabel('Gacha').fill('2025-01-31');
      await page.getByRole('button', { name: 'Filtrlash' }).click();
      await expect(page.getByText('2 ta baholash topildi')).toBeVisible({ timeout: 5000 });

      // 5. Haydovchilar tabiga qaytish va bloklash — Req 7.6
      await page.getByRole('button', { name: 'Haydovchilar' }).click();
      await expect(page.getByText('Alisher Karimov')).toBeVisible({ timeout: 5000 });

      const driverRow = page.locator('div').filter({ hasText: 'Alisher Karimov' }).first();
      await driverRow.getByRole('button', { name: 'Bloklash' }).click();

      // Bloklash so'rovi yuborildi
      await expect(page.getByText('Bloklangan').first()).toBeVisible({ timeout: 5000 });
    });
  });
});
