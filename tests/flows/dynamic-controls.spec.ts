import { test, expect } from '../../fixtures/base.fixture';

test.describe('Dynamic Controls', () => {

  test('should toggle checkbox visibility', async ({ page }) => {
    const baseUrl = process.env.BASE_URL ?? '';
    await page.goto(`${baseUrl}/dynamic_controls`);
    await page.waitForLoadState('networkidle');

    // Checkbox should be visible initially
    const checkbox = page.locator('#checkbox');
    await expect(checkbox).toBeVisible();

    // Click "Remove" button
    await page.click('#checkbox-example button');

    // Wait for checkbox to disappear
    await expect(checkbox).not.toBeVisible({ timeout: 10000 });

    // Click "Add" button to bring it back
    await page.click('#checkbox-example button');
    await expect(checkbox).toBeVisible({ timeout: 10000 });

    console.log('  ✓ Dynamic Controls: checkbox toggle works');
  });

  test('should toggle input enable/disable', async ({ page }) => {
    const baseUrl = process.env.BASE_URL ?? '';
    await page.goto(`${baseUrl}/dynamic_controls`);
    await page.waitForLoadState('networkidle');

    const input = page.locator('#input-example input');
    await expect(input).toBeDisabled();

    // Click "Enable" button
    await page.click('#input-example button');
    await expect(input).toBeEnabled({ timeout: 10000 });

    // Click "Disable" button
    await page.click('#input-example button');
    await expect(input).toBeDisabled({ timeout: 10000 });

    console.log('  ✓ Dynamic Controls: input enable/disable works');
  });

});
