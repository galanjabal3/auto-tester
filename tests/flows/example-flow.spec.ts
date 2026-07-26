import { test, expect } from '../../fixtures/base.fixture';
import { measureApiCall } from '../../core/api-monitor';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Example feature flow test.
 *
 * USAGE — copy this file, rename it, and replace the steps below:
 *
 *   1. Navigate to the feature's page
 *   2. Interact with the UI (fill form, click buttons, etc.)
 *   3. Wait for the API call triggered by the interaction
 *   4. Assert on the result (UI feedback, redirect, API status code)
 *   5. Optionally assert response time
 *
 * Run codegen to generate selectors automatically:
 *   npx playwright codegen https://yourapp.com
 */
test.describe('Example: Form submission flow', () => {

  test('should submit form and show success feedback', async ({ page, getSlowApis }) => {
    const baseUrl = process.env.BASE_URL ?? '';

    // Step 1 — Navigate
    await page.goto(`${baseUrl}/some-feature`);
    await page.waitForLoadState('networkidle');

    // Step 2 — Fill form
    await page.fill('[name="title"]', 'Test entry');
    await page.fill('[name="description"]', 'Created by auto-tester');

    // Step 3 — Submit and measure the API call
    const apiDurationMs = await measureApiCall(
      page,
      () => page.click('button[type="submit"]'),
      res => res.url().includes('/api/') && res.request().method() === 'POST'
    );

    // Step 4 — Assert UI feedback
    await expect(page.locator('.toast, .alert-success, [role="alert"]')).toBeVisible({
      timeout: 5000,
    });

    // Step 5 — Assert response time
    const threshold = Number(process.env.SLOW_API_THRESHOLD_MS ?? 2000);
    expect(apiDurationMs).toBeLessThan(threshold);

    console.log(`  ✓ Form submitted in ${apiDurationMs}ms`);

    // Log any slow APIs detected during this test
    const slowApis = getSlowApis();
    if (slowApis.length > 0) {
      console.warn(`  ⚠ ${slowApis.length} slow API(s) detected during this test`);
    }
  });

});
