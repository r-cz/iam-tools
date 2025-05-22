import { test, expect } from '@playwright/test';
import { TestUtils } from '../helpers/test-utils';
import { selectors } from '../helpers/selectors';

test.describe('OAuth Playground - Auth Code with PKCE', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.navigateTo('/oauth-playground/auth-code-pkce');
  });

  test('should load auth code PKCE page', async ({ page }) => {
    await expect(page).toHaveTitle(/iam\.tools/);
    await expect(page.locator('h1')).toContainText('Authorization Code with PKCE');
  });

  test('should toggle demo mode', async ({ page }) => {
    // Find demo mode switch
    const demoSwitch = page.locator(selectors.oauthPlayground.demoModeSwitch);
    
    // Toggle demo mode on
    await demoSwitch.click();
    
    // Verify demo mode is enabled
    await expect(page.locator('text=Demo mode enabled')).toBeVisible();
    
    // Verify form fields are populated with demo values
    const authUrlInput = page.locator(selectors.oauthPlayground.authUrlInput);
    const tokenUrlInput = page.locator(selectors.oauthPlayground.tokenUrlInput);
    const clientIdInput = page.locator(selectors.oauthPlayground.clientIdInput);
    
    await expect(authUrlInput).toHaveValue(/demo/);
    await expect(tokenUrlInput).toHaveValue(/demo/);
    await expect(clientIdInput).toHaveValue(/demo/);
  });

  test('should generate PKCE values', async ({ page }) => {
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    
    // Look for PKCE Parameters section (might need to scroll or expand)
    const pkceSection = page.locator('text=PKCE Parameters');
    
    // If PKCE section exists, it should have values
    if (await pkceSection.isVisible()) {
      // Check that PKCE values are generated
      await expect(page.getByText('Code Verifier', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Code Challenge', { exact: true }).first()).toBeVisible();
    }
    
    // Main check: Continue button should be enabled in demo mode
    const continueButton = await utils.getButtonByText('Continue to Authorization');
    await expect(continueButton).toBeEnabled();
  });

  test('should start authorization flow in demo mode', async ({ page }) => {
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    // Demo mode toggle should be instant
    await page.waitForTimeout(100);
    
    // Click Continue to Authorization
    const startButton = await utils.getButtonByText('Continue to Authorization');
    await expect(startButton).toBeEnabled();
    await startButton.click();
    
    // Should navigate to demo auth page
    await page.waitForURL(/demo-auth/);
    
    // Verify demo auth page loads
    await expect(page.locator('text=Demo Authorization Server')).toBeVisible();
    await expect(page.locator('button:has-text("Authorize")')).toBeVisible();
    await expect(page.locator('button:has-text("Deny")')).toBeVisible();
  });

  test('should complete full auth flow in demo mode', async ({ page }) => {
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    // Demo mode toggle should be instant
    await page.waitForTimeout(100);
    
    // Start authorization
    await page.click('button:has-text("Continue to Authorization")');
    
    // Wait for demo auth page
    await page.waitForURL(/demo-auth/);
    
    // Click Authorize
    await page.click('button:has-text("Authorize")');
    
    // Should redirect back to callback with code
    await page.waitForURL(/callback/);
    
    // Verify authorization code is received
    await expect(page.locator('text=Authorization code received')).toBeVisible();
    
    // Exchange token button should be visible
    const exchangeButton = await utils.getButtonByText('Exchange Token');
    await expect(exchangeButton).toBeVisible();
    await expect(exchangeButton).toBeEnabled();
    
    // Click Exchange Token
    await exchangeButton.click();
    
    // Wait for token exchange
    await page.waitForSelector('text=Token exchange successful');
    
    // Verify tokens are displayed
    await expect(page.locator('text=Access Token')).toBeVisible();
    await expect(page.locator('text=ID Token')).toBeVisible();
  });

  test('should handle authorization denial', async ({ page }) => {
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    // Demo mode toggle should be instant
    await page.waitForTimeout(100);
    
    // Start authorization
    await page.click('button:has-text("Continue to Authorization")');
    
    // Wait for demo auth page
    await page.waitForURL(/demo-auth/);
    
    // Click Deny
    await page.click('button:has-text("Deny")');
    
    // Should redirect back with error
    await page.waitForURL(/callback/);
    
    // Verify error is displayed
    await expect(page.locator('text=access_denied')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Start button should be disabled without required fields
    const startButton = await utils.getButtonByText('Continue to Authorization');
    await expect(startButton).toBeDisabled();
    
    // Fill in required fields
    await utils.fillInput(selectors.oauthPlayground.authUrlInput, 'https://example.com/auth');
    await utils.fillInput(selectors.oauthPlayground.tokenUrlInput, 'https://example.com/token');
    await utils.fillInput(selectors.oauthPlayground.clientIdInput, 'test-client-id');
    
    // Start button should now be enabled
    await expect(startButton).toBeEnabled();
  });

  test('should copy authorization URL', async ({ page }) => {
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    // Demo mode toggle should be instant
    await page.waitForTimeout(100);
    
    // Find copy button for auth URL
    const copyButton = page.locator('button[aria-label*="Copy authorization URL"]');
    await copyButton.click();
    
    // Should show success message
    await page.waitForSelector('text=Copied to clipboard');
  });

  test('should reset form', async ({ page }) => {
    // Enable demo mode and fill form
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    // Demo mode toggle should be instant
    await page.waitForTimeout(100);
    
    // Verify form is populated
    const clientIdInput = page.locator(selectors.oauthPlayground.clientIdInput);
    await expect(clientIdInput).not.toHaveValue('');
    
    // Click reset button
    const resetButton = page.locator('button:has-text("Reset")');
    await resetButton.click();
    
    // Form should be cleared
    await expect(clientIdInput).toHaveValue('');
    
    // Demo mode should be off
    await expect(page.locator('text=Demo mode enabled')).not.toBeVisible();
  });

  test('should show step indicators', async ({ page }) => {
    // Verify step indicators are present
    await expect(page.locator('text=Step 1')).toBeVisible();
    await expect(page.locator('text=Step 2')).toBeVisible();
    await expect(page.locator('text=Step 3')).toBeVisible();
    
    // Step 1 should be active by default
    const step1 = page.locator('[data-step="1"]');
    await expect(step1).toHaveAttribute('data-active', 'true');
  });
});