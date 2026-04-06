/**
 * E2E: Mijoz oqimi — QR skanerlash → OTP tasdiqlash → baholash yuborish → tasdiqlash xabari
 * Validates: Requirements 1.4, 5.1, 5.2
 */
import { test, expect } from '@playwright/test';

const QR_CODE = 'TEST-QR-001';
const ENCODED_QR = encodeURIComponent(QR_CODE);
const PHONE = '+998901234567';

const MOCK_DRIVER = {
  id: 'driver-1',
  fullName: 'Alisher Karimov',
  carNumber: '01A123BC',
  isBlocked: false,
};

test.describe('Mijoz baholash oqimi', () => {
  test.beforeEach(async ({ page }) => {
    // Mock GET /api/driver/:qrCode
    await page.route(`**/api/driver/${ENCODED_QR}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_DRIVER),
      });
    });

    // Mock POST /api/auth/send-otp
    await page.route('**/api/auth/send-otp', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'OTP yuborildi' }),
      });
    });

    // Mock POST /api/auth/verify-otp
    await page.route('**/api/auth/verify-otp', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Tasdiqlandi' }),
      });
    });

    // Mock POST /api/ratings
    await page.route('**/api/ratings', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Baholash saqlandi' }),
      });
    });
  });

  test('1. /scan sahifasiga o\'tish va QR skaner ko\'rinishi', async ({ page }) => {
    await page.goto('/scan');
    // The page renders — camera may not be available in headless, but the page loads
    await expect(page).toHaveURL('/scan');
    // Page should have some content (camera overlay or error state)
    await expect(page.locator('body')).toBeVisible();
  });

  test('2. QR skanerlashdan so\'ng OTP sahifasiga yo\'naltirish', async ({ page }) => {
    // Simulate QR scan result: navigate directly to /otp?qr=<qrCode>
    await page.goto(`/otp?qr=${ENCODED_QR}`);
    await expect(page).toHaveURL(`/otp?qr=${ENCODED_QR}`);
    // Phone input should be visible
    await expect(page.getByPlaceholder('+998 XX XXX XX XX')).toBeVisible();
  });

  test('3. Telefon raqami kiritish va OTP yuborish', async ({ page }) => {
    await page.goto(`/otp?qr=${ENCODED_QR}`);

    const phoneInput = page.getByPlaceholder('+998 XX XXX XX XX');
    await phoneInput.fill('901234567');

    // Wait for the button to become enabled (phone complete)
    const sendBtn = page.getByRole('button', { name: 'OTP yuborish' });
    await expect(sendBtn).toBeEnabled({ timeout: 3000 });
    await sendBtn.click();

    // After OTP sent, SMS code input should appear
    await expect(page.getByPlaceholder('------')).toBeVisible({ timeout: 5000 });
  });

  test('4. OTP kodi kiritish va tasdiqlash', async ({ page }) => {
    await page.goto(`/otp?qr=${ENCODED_QR}`);

    // Fill phone
    await page.getByPlaceholder('+998 XX XXX XX XX').fill('901234567');
    await page.getByRole('button', { name: 'OTP yuborish' }).click();

    // Fill OTP
    const otpInput = page.getByPlaceholder('------');
    await expect(otpInput).toBeVisible({ timeout: 5000 });
    await otpInput.fill('123456');

    const confirmBtn = page.getByRole('button', { name: 'Tasdiqlash' });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Should navigate to /rate/:qrCode
    await expect(page).toHaveURL(new RegExp(`/rate/${ENCODED_QR}`), { timeout: 5000 });
  });

  test('5. Baholash formasida haydovchi ma\'lumotlari ko\'rinishi', async ({ page }) => {
    await page.goto(`/rate/${ENCODED_QR}?phone=${encodeURIComponent(PHONE)}`);

    // Driver name and car number should be visible
    await expect(page.getByText('Alisher Karimov')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('01A123BC')).toBeVisible();
  });

  test('6. 5 yulduz tanlash va baholash yuborish', async ({ page }) => {
    await page.goto(`/rate/${ENCODED_QR}?phone=${encodeURIComponent(PHONE)}`);

    // Wait for driver info to load
    await expect(page.getByText('Alisher Karimov')).toBeVisible({ timeout: 5000 });

    // Stars have aria-label="N yulduz" — click the 5th star
    await page.getByRole('button', { name: '5 yulduz' }).click();

    // Submit the rating
    await page.getByRole('button', { name: 'Baholash' }).click();

    // Confirmation message should appear — Requirement 5.2
    await expect(
      page.getByText('Baholingiz qabul qilindi. Rahmat!')
    ).toBeVisible({ timeout: 5000 });
  });

  test('7. To\'liq mijoz oqimi: OTP → baholash → tasdiqlash', async ({ page }) => {
    // Step 1: OTP page
    await page.goto(`/otp?qr=${ENCODED_QR}`);
    await page.getByPlaceholder('+998 XX XXX XX XX').fill('901234567');
    await page.getByRole('button', { name: 'OTP yuborish' }).click();

    await expect(page.getByPlaceholder('------')).toBeVisible({ timeout: 5000 });
    await page.getByPlaceholder('------').fill('123456');
    await page.getByRole('button', { name: 'Tasdiqlash' }).click();

    // Step 2: Rating form
    await expect(page).toHaveURL(new RegExp(`/rate/${ENCODED_QR}`), { timeout: 5000 });
    await expect(page.getByText('Alisher Karimov')).toBeVisible({ timeout: 5000 });

    // Step 3: Select 5 stars using aria-label
    await expect(page.getByText('Alisher Karimov')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: '5 yulduz' }).click();

    // Step 4: Submit
    await page.getByRole('button', { name: 'Baholash' }).click();

    // Step 5: Confirmation — Requirements 5.2
    await expect(
      page.getByText('Baholingiz qabul qilindi. Rahmat!')
    ).toBeVisible({ timeout: 5000 });
  });

  test('8. Umumiy baho tanlanmasa validatsiya xabari ko\'rinishi', async ({ page }) => {
    await page.goto(`/rate/${ENCODED_QR}?phone=${encodeURIComponent(PHONE)}`);
    await expect(page.getByText('Alisher Karimov')).toBeVisible({ timeout: 5000 });

    // Submit without selecting a star
    await page.getByRole('button', { name: 'Baholash' }).click();

    // Validation error — Requirement 2.4
    await expect(page.getByText('Umumiy bahoni tanlang')).toBeVisible();
  });

  test('9. Noto\'g\'ri QR kod uchun xato xabari', async ({ page }) => {
    const badQr = 'INVALID-QR';
    await page.route(`**/api/driver/${encodeURIComponent(badQr)}`, (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    });

    await page.goto(`/rate/${encodeURIComponent(badQr)}?phone=${encodeURIComponent(PHONE)}`);

    // Should show error message — Requirement 1.3
    await expect(
      page.getByText('QR kod yaroqsiz yoki topilmadi')
    ).toBeVisible({ timeout: 5000 });
  });
});
