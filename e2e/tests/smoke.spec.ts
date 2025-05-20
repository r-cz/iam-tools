import { test, expect } from '@playwright/test';

/**
 * Basic smoke tests to verify that the application loads correctly
 */
test.describe('Smoke Tests', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/IAM Tools/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/IAM Tools/);
  });

  test('should navigate to Token Inspector', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /token inspector/i }).click();
    await expect(page.url()).toContain('/token-inspector');
    await expect(page.getByTestId('token-input')).toBeVisible();
  });

  test('should navigate to OIDC Explorer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /oidc explorer/i }).click();
    await expect(page.url()).toContain('/oidc-explorer');
    await expect(page.getByTestId('config-input')).toBeVisible();
  });

  test('should navigate to OAuth Playground', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /oauth playground/i }).click();
    await expect(page.url()).toContain('/oauth-playground');
    await expect(page.getByTestId('flow-selector')).toBeVisible();
  });

  test('should toggle between light and dark mode', async ({ page }) => {
    await page.goto('/');
    
    // Get initial theme
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
    
    // Toggle theme
    await page.getByRole('button', { name: /toggle theme/i }).click();
    
    // Check if theme was toggled
    const newTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
    
    expect(newTheme).not.toEqual(initialTheme);
  });
});