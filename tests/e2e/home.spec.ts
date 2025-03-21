import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check page title (fixed to match actual title)
    await expect(page).toHaveTitle(/iam\.tools/);
    
    // Check that the page has loaded correctly by looking for any heading
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible();
    
    // Check navigation is present (any nav element)
    const navigation = page.locator('nav');
    await expect(navigation).toBeVisible();
  });
});
