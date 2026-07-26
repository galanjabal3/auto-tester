import { test, expect } from '../../fixtures/base.fixture';

test.describe('Dropdown', () => {

  test('should select options from dropdown', async ({ page }) => {
    const baseUrl = process.env.BASE_URL ?? '';
    await page.goto(`${baseUrl}/dropdown`);
    await page.waitForLoadState('networkidle');

    const dropdown = page.locator('#dropdown');

    // Select option 1
    await dropdown.selectOption('1');
    await expect(dropdown).toHaveValue('1');

    // Select option 2
    await dropdown.selectOption('2');
    await expect(dropdown).toHaveValue('2');

    console.log('  ✓ Dropdown: option selection works');
  });

});
