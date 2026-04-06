/**
 * E2E: Haydovchi oqimi — Login → panel ko'rish → statistika va baholashlar
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */
import { test, expect } from '@playwright/test';

const MOCK_STATS = {
  averageRating: 4.3,
  totalRatings: 87,
  trend30Days: 0.2,
  categoryAverages: {
    cleanliness: 4.5,
    politeness: 4.6,
    drivingStyle: 4.1,
    punctuality: 4.0,
  },
};

const MOCK_RATINGS = [
  {
    id: 'r-1',
    overallRating: 5,
    cleanliness: 'good',
    politeness: 'good',
    drivingStyle: 'good',
    punctuality: 'good',
    comment: 'Juda yaxshi haydovchi!',
    monthYear: '2025-01',
  },
  {
    id: 'r-2',
    overallRating: 4,
    cleanliness: 'good',
    politeness: 'average',
    drivingStyle: 'good',
    punctuality: 'good',
    comment: '',
    monthYear: '2025-01',
  },
  {
    id: 'r-3',
    overallRating: 3,
    cleanliness: 'average',
    politeness: 'good',
    drivingStyle: 'average',
    punctuality: 'bad',
    comment: "O'rtacha xizmat",
    monthYear: '2024-12',
  },
];

const MOCK_AUTH_ME = {
  role: 'driver',
  userId: 'driver-1',
};

test.describe('Haydovchi oqimi', () => {
  test.describe('Muvaffaqiyatli login va panel', () => {
    test.beforeEach(async ({ page }) => {
      // Mock POST /api/auth/driver/login
      await page.route('**/api/auth/driver/login', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Muvaffaqiyatli kirildi' }),
        });
      });

      // Mock GET /api/auth/me
      await page.route('**/api/auth/me', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_AUTH_ME),
        });
      });

      // Mock GET /api/driver/me/stats
      await page.route('**/api/driver/me/stats', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_STATS),
        });
      });

      // Mock GET /api/driver/me/ratings
      await page.route('**/api/driver/me/ratings', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_RATINGS),
        });
      });
    });

    test('1. Login sahifasi to\'g\'ri ko\'rinishi — Req 6.1', async ({ page }) => {
      await page.goto('/driver/login');
      await expect(page).toHaveURL('/driver/login');
      await expect(page.getByText('Haydovchi Paneli')).toBeVisible();
      await expect(page.getByPlaceholder('Loginni kiriting')).toBeVisible();
      await expect(page.getByPlaceholder('Parolni kiriting')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Kirish' })).toBeVisible();
    });

    test('2. Login → dashboard yo\'naltirish — Req 6.1', async ({ page }) => {
      await page.goto('/driver/login');

      await page.getByPlaceholder('Loginni kiriting').fill('01A123BC');
      await page.getByPlaceholder('Parolni kiriting').fill('secret123');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page).toHaveURL('/driver/dashboard', { timeout: 5000 });
    });

    test('3. Dashboard: o\'rtacha reyting, jami baholashlar, 30-kunlik trend — Req 6.2', async ({ page }) => {
      await page.goto('/driver/login');
      await page.getByPlaceholder('Loginni kiriting').fill('01A123BC');
      await page.getByPlaceholder('Parolni kiriting').fill('secret123');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page).toHaveURL('/driver/dashboard', { timeout: 5000 });

      // O'rtacha reyting
      await expect(page.getByText('4.3')).toBeVisible({ timeout: 5000 });

      // Jami baholashlar soni
      await expect(page.getByText('87 ta baholash')).toBeVisible();

      // 30-kunlik trend (ijobiy trend +0.2)
      await expect(page.getByText('+0.2 (30 kun)')).toBeVisible();
    });

    test('4. Dashboard: kategoriyalar bo\'yicha o\'rtacha baholar — Req 6.3', async ({ page }) => {
      await page.goto('/driver/login');
      await page.getByPlaceholder('Loginni kiriting').fill('01A123BC');
      await page.getByPlaceholder('Parolni kiriting').fill('secret123');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page).toHaveURL('/driver/dashboard', { timeout: 5000 });

      // Kategoriya sarlavhalari
      await expect(page.getByText('Tozalik')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Xushmuomalalik')).toBeVisible();
      await expect(page.getByText('Haydash Uslubi')).toBeVisible();
      await expect(page.getByText('Vaqtida Kelish')).toBeVisible();

      // Kategoriya qiymatlari
      await expect(page.getByText('4.5')).toBeVisible();
      await expect(page.getByText('4.6')).toBeVisible();
      await expect(page.getByText('4.1')).toBeVisible();
      await expect(page.getByText('4.0')).toBeVisible();
    });

    test('5. Dashboard: so\'nggi baholashlar ro\'yxati oy/yil bilan — Req 6.4', async ({ page }) => {
      await page.goto('/driver/login');
      await page.getByPlaceholder('Loginni kiriting').fill('01A123BC');
      await page.getByPlaceholder('Parolni kiriting').fill('secret123');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page).toHaveURL('/driver/dashboard', { timeout: 5000 });

      // Baholashlar bo'limi sarlavhasi
      await expect(page.getByText("So'nggi baholashlar")).toBeVisible({ timeout: 5000 });

      // Oy/yil formati (aniq sana emas) — "Yanvar 2025", "Dekabr 2024"
      await expect(page.getByText('Yanvar 2025').first()).toBeVisible();
      await expect(page.getByText('Dekabr 2024')).toBeVisible();

      // Izoh ko'rinishi
      await expect(page.getByText('Juda yaxshi haydovchi!')).toBeVisible();
      await expect(page.getByText("O'rtacha xizmat")).toBeVisible();
    });

    test('6. To\'liq haydovchi oqimi: login → statistika → baholashlar — Req 6.1, 6.2, 6.3, 6.4', async ({ page }) => {
      // 1. Login sahifasiga o'tish
      await page.goto('/driver/login');
      await expect(page).toHaveURL('/driver/login');

      // 2. Login ma'lumotlarini kiritish
      await page.getByPlaceholder('Loginni kiriting').fill('01A123BC');
      await page.getByPlaceholder('Parolni kiriting').fill('secret123');
      await page.getByRole('button', { name: 'Kirish' }).click();

      // 3. Dashboard ga yo'naltirish
      await expect(page).toHaveURL('/driver/dashboard', { timeout: 5000 });

      // 4. Statistika ko'rinishi — Req 6.2
      await expect(page.getByText('4.3')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('87 ta baholash')).toBeVisible();
      await expect(page.getByText('+0.2 (30 kun)')).toBeVisible();

      // 5. Kategoriyalar — Req 6.3
      await expect(page.getByText('Tozalik')).toBeVisible();
      await expect(page.getByText('Xushmuomalalik')).toBeVisible();

      // 6. Baholashlar ro'yxati oy/yil bilan — Req 6.4
      await expect(page.getByText('Yanvar 2025').first()).toBeVisible();
      await expect(page.getByText('Juda yaxshi haydovchi!')).toBeVisible();
    });
  });

  test.describe('Autentifikatsiya himoyasi', () => {
    test('7. Autentifikatsiyasiz /driver/dashboard ga kirish /driver/login ga yo\'naltiradi — Req 6.1', async ({ page }) => {
      // 401 qaytaruvchi mock — autentifikatsiya yo'q
      await page.route('**/api/driver/me/stats', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      });

      await page.route('**/api/driver/me/ratings', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      });

      await page.goto('/driver/dashboard');

      // 401 xatosi tufayli login sahifasiga yo'naltirilishi kerak
      await expect(page).toHaveURL('/driver/login', { timeout: 5000 });
    });

    test('8. Noto\'g\'ri login ma\'lumotlari xato xabarini ko\'rsatadi — Req 6.1', async ({ page }) => {
      await page.route('**/api/auth/driver/login', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: "Login yoki parol noto'g'ri" }),
        });
      });

      await page.goto('/driver/login');
      await page.getByPlaceholder('Loginni kiriting').fill('wronguser');
      await page.getByPlaceholder('Parolni kiriting').fill('wrongpass');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page.getByText("Login yoki parol noto'g'ri")).toBeVisible({ timeout: 5000 });
      await expect(page).toHaveURL('/driver/login');
    });

    test('9. Bo\'sh maydonlar bilan yuborishda validatsiya xabari — Req 6.1', async ({ page }) => {
      await page.goto('/driver/login');
      await page.getByRole('button', { name: 'Kirish' }).click();

      await expect(page.getByText('Login va parolni kiriting')).toBeVisible();
      await expect(page).toHaveURL('/driver/login');
    });
  });
});
