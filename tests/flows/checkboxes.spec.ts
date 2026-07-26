import { test, expect } from '../../fixtures/base.fixture';

test.describe('Checkboxes', () => {

  test('should toggle checkboxes correctly', async ({ page }) => {
    const baseUrl = process.env.BASE_URL ?? '';
    await page.goto(`${baseUrl}/checkboxes`);
    await page.waitForLoadState('networkidle');

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);

    // Check all checkboxes
    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);
      if (!(await checkbox.isChecked())) {
        await checkbox.check();
      }
      expect(await checkbox.isChecked()).toBe(true);
    }

    // Uncheck all checkboxes
    for (let i = 0; i < count; i++) {
      const checkbox = checkboxes.nth(i);
      if (await checkbox.isChecked()) {
        await checkbox.uncheck();
      }
      expect(await checkbox.isChecked()).toBe(false);
    }

    console.log(`  ✓ Checkboxes: toggled ${count} checkboxes`);
  });

});
