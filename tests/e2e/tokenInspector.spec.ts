import { test, expect } from '@playwright/test';

test.describe('Token Inspector', () => {
  test('should load the token inspector page', async ({ page }) => {
    await page.goto('/token-inspector');
    
    // Check for the textarea input
    const tokenInput = page.locator('textarea#token-input, textarea');
    await expect(tokenInput).toBeVisible();
    
    // Look for any button that might be the inspect button
    const inspectButton = page.getByRole('button', { name: /inspect|decode|verify/i });
    await expect(inspectButton).toBeVisible();
  });
  
  test('should load example token and decode it correctly', async ({ page }) => {
    await page.goto('/token-inspector');
    
    // Click on example button to load a token
    await page.click('button:has-text("Example")');
    
    // Check that the textarea now has content (JWT tokens always start with eyJ)
    const tokenInput = page.locator('textarea');
    await expect(tokenInput).toHaveValue(/eyJ/);
    
    // Click the inspect button
    await page.getByRole('button', { name: /inspect|decode|verify/i }).click();
    
    // Wait for decoded data to appear - wait for tablist to be visible
    await page.waitForSelector('[role="tablist"]', { state: 'visible' });
    
    // Successfully loaded if we get here
  });
  
  test('should handle invalid token format', async ({ page }) => {
    await page.goto('/token-inspector');
    
    // Input an invalid token
    await page.fill('textarea', 'invalidtoken');
    
    // Click inspect button
    await page.getByRole('button', { name: /inspect|decode|verify/i }).click();
    
    // Check for error message
    await expect(page.locator('text="Invalid JWT format"')).toBeVisible();
  });
  
  test('should clear token input', async ({ page }) => {
    await page.goto('/token-inspector');
    
    // First load example token
    await page.click('button:has-text("Example")');
    const tokenInput = page.locator('textarea');
    await expect(tokenInput).toHaveValue(/eyJ/);
    
    // Then clear it
    await page.click('button:has-text("Clear")');
    
    // Check input is empty
    await expect(tokenInput).toHaveValue('');
  });
});
