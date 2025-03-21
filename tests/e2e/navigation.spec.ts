import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should display navigation elements', async ({ page }) => {
    await page.goto('/');
    
    // Check that at least the nav element exists
    const navigation = page.locator('nav');
    await expect(navigation).toBeVisible();
    
    // Success if we reach this point
  });
});
