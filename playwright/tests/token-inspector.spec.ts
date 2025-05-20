import { test, expect } from '@playwright/test';
import { Navigation } from '../utils/navigation';
import { ComponentSelectors } from '../utils/component-selectors';

test.describe('Token Inspector Feature', () => {
  test('loads the token inspector page', async ({ page }) => {
    const nav = new Navigation(page);
    await nav.goToTokenInspector();
    
    await expect(page).toHaveURL(/token-inspector/);
    await expect(page.getByRole('heading', { name: /Token Inspector/i })).toBeVisible();
  });

  test('displays sample tokens in the selector', async ({ page }) => {
    const nav = new Navigation(page);
    await nav.goToTokenInspector();
    
    // Check that example tokens are available
    await expect(page.getByText(/Example Tokens/i)).toBeVisible();
  });

  test('parses a valid JWT token', async ({ page }) => {
    const nav = new Navigation(page);
    const selectors = new ComponentSelectors(page);
    await nav.goToTokenInspector();
    
    // Sample JWT token (this is a test token, not a real one)
    const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
    // Enter the token in the input field
    await selectors.getTokenInput().fill(sampleToken);
    
    // Check that token parts are displayed
    await expect(selectors.getTokenHeader()).toBeVisible();
    await expect(selectors.getTokenPayload()).toBeVisible();
    
    // Verify some token content is displayed
    await expect(page.getByText('John Doe')).toBeVisible();
  });
});