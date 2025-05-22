import { test, expect } from '@playwright/test';
import { TestUtils } from '../helpers/test-utils';
import { selectors } from '../helpers/selectors';

test.describe('OAuth Playground - Client Credentials', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.navigateTo('/oauth-playground/client-credentials');
  });

  test('should load client credentials page', async ({ page }) => {
    await expect(page).toHaveTitle(/iam\.tools/);
    await expect(page.locator('h1')).toContainText('Client Credentials Flow');
  });

  test('should toggle demo mode', async ({ page }) => {
    // Find demo mode switch
    const demoSwitch = page.locator(selectors.oauthPlayground.demoModeSwitch);
    
    // Toggle demo mode on
    await demoSwitch.click();
    
    // Verify demo mode is enabled
    await expect(page.locator('text=Demo mode enabled')).toBeVisible();
    
    // Verify form fields are populated with demo values
    const tokenUrlInput = page.locator(selectors.oauthPlayground.tokenUrlInput);
    const clientIdInput = page.locator(selectors.oauthPlayground.clientIdInput);
    const clientSecretInput = page.locator(selectors.oauthPlayground.clientSecretInput);
    
    await expect(tokenUrlInput).toHaveValue(/demo/);
    await expect(clientIdInput).toHaveValue(/demo/);
    await expect(clientSecretInput).toHaveValue(/demo/);
  });

  test('should request token in demo mode', async ({ page }) => {
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    // Demo mode toggle should be instant
    await page.waitForTimeout(100);
    
    // Request Token button should be enabled
    const requestButton = await utils.getButtonByText('Request Token');
    await expect(requestButton).toBeEnabled();
    
    // Click Request Token
    await requestButton.click();
    
    // Wait for token response
    await page.waitForSelector('text=Token request successful');
    
    // Verify access token is displayed
    await expect(page.locator('text=Access Token')).toBeVisible();
    await expect(page.locator('text=Token Type')).toBeVisible();
    await expect(page.locator('text=Expires In')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Request button should be disabled without required fields
    const requestButton = await utils.getButtonByText('Request Token');
    await expect(requestButton).toBeDisabled();
    
    // Fill in required fields
    await utils.fillInput(selectors.oauthPlayground.tokenUrlInput, 'https://example.com/token');
    await utils.fillInput(selectors.oauthPlayground.clientIdInput, 'test-client-id');
    await utils.fillInput(selectors.oauthPlayground.clientSecretInput, 'test-client-secret');
    
    // Request button should now be enabled
    await expect(requestButton).toBeEnabled();
  });

  test('should handle custom scopes', async ({ page }) => {
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    // Demo mode toggle should be instant
    await page.waitForTimeout(100);
    
    // Add custom scopes
    const scopeInput = page.locator(selectors.oauthPlayground.scopeInput);
    await scopeInput.clear();
    await scopeInput.fill('read:users write:users admin');
    
    // Request token
    await page.click('button:has-text("Request Token")');
    
    // Wait for success
    await page.waitForSelector('text=Token request successful');
    
    // Verify scopes are included in response
    await expect(page.locator('text=read:users write:users admin')).toBeVisible();
  });

  test('should copy access token', async ({ page }) => {
    // Enable demo mode and request token
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    // Demo mode toggle should be instant
    await page.waitForTimeout(100);
    await page.click('button:has-text("Request Token")');
    await page.waitForSelector('text=Token request successful');
    
    // Find copy button for access token
    const copyButton = page.locator('button[aria-label*="Copy access token"]');
    await copyButton.click();
    
    // Should show success message
    await page.waitForSelector('text=Copied to clipboard');
  });

  test('should display request details', async ({ page }) => {
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    // Demo mode toggle should be instant
    await page.waitForTimeout(100);
    
    // Verify request preview is shown
    await expect(page.locator('text=Request Preview')).toBeVisible();
    await expect(page.locator('text=POST')).toBeVisible();
    await expect(page.locator('text=grant_type=client_credentials')).toBeVisible();
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

  test('should handle token request error', async ({ page }) => {
    // Fill in invalid endpoint
    await utils.fillInput(selectors.oauthPlayground.tokenUrlInput, 'https://invalid.example.com/token');
    await utils.fillInput(selectors.oauthPlayground.clientIdInput, 'test-client');
    await utils.fillInput(selectors.oauthPlayground.clientSecretInput, 'test-secret');
    
    // Request token
    await page.click('button:has-text("Request Token")');
    
    // Should show error message
    await page.waitForSelector('text=Token request failed');
  });

  test('should show authentication method options', async ({ page }) => {
    // Verify authentication method selector is present
    await expect(page.locator('text=Authentication Method')).toBeVisible();
    
    // Should have Basic Auth selected by default
    await expect(page.locator('input[value="basic"]')).toBeChecked();
    
    // Should have option for POST body
    await expect(page.locator('text=POST Body')).toBeVisible();
  });

  test('should handle additional parameters', async ({ page }) => {
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    // Demo mode toggle should be instant
    await page.waitForTimeout(100);
    
    // Find additional parameters section
    const addParamButton = page.locator('button:has-text("Add Parameter")');
    if (await addParamButton.isVisible()) {
      await addParamButton.click();
      
      // Add custom parameter
      await page.fill('input[placeholder="Parameter name"]', 'custom_param');
      await page.fill('input[placeholder="Parameter value"]', 'custom_value');
      
      // Request token
      await page.click('button:has-text("Request Token")');
      
      // Wait for success
      await page.waitForSelector('text=Token request successful');
    }
  });
});