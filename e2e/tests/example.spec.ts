import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  
  // Check that the page has the expected title
  await expect(page).toHaveTitle(/IAM Tools/);
});

test('navigation works', async ({ page }) => {
  await page.goto('/');
  
  // Check that we can navigate to Token Inspector
  await page.getByRole('link', { name: /token inspector/i }).click();
  await expect(page).toHaveURL(/.*token-inspector/);
});