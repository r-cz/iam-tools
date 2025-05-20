import { test, expect } from '@playwright/test';

test('homepage has correct title', async ({ page }) => {
  await page.goto('/');
  
  // Check that the page title contains "IAM Tools"
  await expect(page).toHaveTitle(/IAM Tools/);
});

test('homepage navigation works', async ({ page }) => {
  await page.goto('/');
  
  // Check that the main feature sections are available in navigation
  await expect(page.getByRole('link', { name: /Token Inspector/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /OIDC Explorer/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /OAuth Playground/i })).toBeVisible();
});