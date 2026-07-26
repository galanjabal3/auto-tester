import { test, expect } from '../../fixtures/base.fixture';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Login tests — verify that authentication works correctly.
 * These run against BASE_URL using TEST_EMAIL / TEST_PASSWORD from .env.
 */
test.describe('Authentication', () => {

  test('should login successfully with valid credentials', async ({ page }) => {
    const baseUrl   = process.env.BASE_URL ?? '';
    const loginPath = process.env.LOGIN_PATH ?? '/login';

    await page.goto(baseUrl + loginPath);

    // Fill credentials
    await page.fill(process.env.EMAIL_SELECTOR ?? '[name="email"]', process.env.TEST_EMAIL ?? '');
    await page.fill(process.env.PASSWORD_SELECTOR ?? '[name="password"]', process.env.TEST_PASSWORD ?? '');

    // Submit and wait for redirect
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click(process.env.SUBMIT_SELECTOR ?? 'button[type="submit"]'),
    ]);

    // Should no longer be on the login page
    expect(page.url()).not.toContain(loginPath);

    console.log(`  ✓ Redirected to: ${page.url()}`);
  });


  test('should show error with wrong password', async ({ page }) => {
    const baseUrl   = process.env.BASE_URL ?? '';
    const loginPath = process.env.LOGIN_PATH ?? '/login';

    await page.goto(baseUrl + loginPath);

    await page.fill(process.env.EMAIL_SELECTOR    ?? '[name="email"]',    process.env.TEST_EMAIL ?? '');
    await page.fill(process.env.PASSWORD_SELECTOR ?? '[name="password"]', 'wrong-password-intentional');

    await page.click(process.env.SUBMIT_SELECTOR ?? 'button[type="submit"]');

    // Should still be on login page
    await page.waitForTimeout(2000);
    expect(page.url()).toContain(loginPath);

    console.log('  ✓ Login correctly rejected with wrong password');
  });

});
