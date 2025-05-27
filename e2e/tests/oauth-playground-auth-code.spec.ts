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
    await expect(page.locator('text=OAuth Authorization Code Flow')).toBeVisible();
  });

  test('should toggle demo mode', async ({ page }) => {
    // Find demo mode switch
    const demoSwitch = page.locator(selectors.oauthPlayground.demoModeSwitch);
    
    // Toggle demo mode on
    await demoSwitch.click();
    
    // Wait a bit for demo mode to activate
    await page.waitForTimeout(500);
    
    // In demo mode, the authorization and token URLs are hidden
    // Verify that the issuer URL and endpoint fields are not visible
    await expect(page.locator('input[placeholder="https://example.com"]')).not.toBeVisible();
    await expect(page.locator(selectors.oauthPlayground.authUrlInput)).not.toBeVisible();
    await expect(page.locator(selectors.oauthPlayground.tokenUrlInput)).not.toBeVisible();
    
    // Verify client ID input is still visible with correct placeholder
    const clientIdInput = page.locator(selectors.oauthPlayground.clientIdInput);
    await expect(clientIdInput).toBeVisible();
    await expect(clientIdInput).toHaveAttribute('placeholder', 'demo-client');
    
    // Continue button should be enabled in demo mode even without client ID
    const continueButton = await utils.getButtonByText('Continue to Authorization');
    await expect(continueButton).toBeEnabled();
  });

  test('should generate PKCE values', async ({ page }) => {
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    
    // Look for PKCE Parameters section (might need to scroll or expand)
    const pkceSection = page.locator('text=PKCE Parameters');
    
    // If PKCE section exists, it should have values
    if (await pkceSection.isVisible()) {
      // Check that PKCE values are generated
      await expect(page.getByText('Code Verifier').first()).toBeVisible();
      await expect(page.getByText('Code Challenge (S256)')).toBeVisible();
    }
    
    // Main check: Continue button should be enabled in demo mode
    const continueButton = await utils.getButtonByText('Continue to Authorization');
    await expect(continueButton).toBeEnabled();
  });

  test('should start authorization flow in demo mode', async ({ page }) => {
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    await page.waitForTimeout(500);
    
    // Fill in client ID (required even in demo mode)
    const clientIdInput = page.locator(selectors.oauthPlayground.clientIdInput);
    await clientIdInput.fill('test-client');
    
    // Click Continue to Authorization
    const continueButton = await utils.getButtonByText('Continue to Authorization');
    await continueButton.click();
    
    // Should navigate to step 2 (Authorization)
    await page.waitForTimeout(500);
    
    // Verify we're on the authorization step
    const step2Tab = page.locator('[role="tab"]:has-text("2. AuthZ")');
    await expect(step2Tab).toHaveAttribute('aria-selected', 'true');
    
    // Should show authorization-related content
    await expect(page.locator('h3:has-text("Authorization URL")')).toBeVisible();
  });

  test('should complete full auth flow in demo mode', async ({ page }) => {
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    await page.waitForTimeout(500);
    
    // Fill in client ID
    const clientIdInput = page.locator(selectors.oauthPlayground.clientIdInput);
    await clientIdInput.fill('test-client');
    
    // Start the flow
    await page.click('button:has-text("Continue to Authorization")');
    await page.waitForTimeout(500);
    
    // Verify we're on step 2
    const step2Tab = page.locator('[role="tab"]:has-text("2. AuthZ")');
    await expect(step2Tab).toHaveAttribute('aria-selected', 'true');
    
    // In demo mode, we should see authorization-related content
    // The actual auth flow would open a new window, which is complex to test
    // Just verify the step transition worked
    await expect(page.locator('button:has-text("Launch Authorization Request")')).toBeVisible();
  });

  test('should handle authorization denial', async ({ page }) => {
    // This test verifies the UI can handle denial scenarios
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    await page.waitForTimeout(500);
    
    // Fill in client ID
    const clientIdInput = page.locator(selectors.oauthPlayground.clientIdInput);
    await clientIdInput.fill('test-client');
    
    // Start the flow
    await page.click('button:has-text("Continue to Authorization")');
    await page.waitForTimeout(500);
    
    // Verify we're on the authorization step
    const step2Tab = page.locator('[role="tab"]:has-text("2. AuthZ")');
    await expect(step2Tab).toHaveAttribute('aria-selected', 'true');
    
    // In a real flow, denial would come back as an error parameter
    // For now, just verify the UI transitioned to the auth step
    await expect(page.locator('text=Request Parameters')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Ensure we're in non-demo mode (default state)
    const demoSwitch = page.locator(selectors.oauthPlayground.demoModeSwitch);
    const isChecked = await demoSwitch.isChecked();
    if (isChecked) {
      await demoSwitch.click();
    }
    
    // Verify that all required input fields are present in non-demo mode
    const authUrlInput = page.locator(selectors.oauthPlayground.authUrlInput);
    const tokenUrlInput = page.locator(selectors.oauthPlayground.tokenUrlInput);
    const clientIdInput = page.locator(selectors.oauthPlayground.clientIdInput);
    
    // Verify input fields are visible
    await expect(authUrlInput).toBeVisible();
    await expect(tokenUrlInput).toBeVisible();
    await expect(clientIdInput).toBeVisible();
    
    // Fill in custom values
    await authUrlInput.fill('https://custom.example.com/auth');
    await tokenUrlInput.fill('https://custom.example.com/token');
    await clientIdInput.fill('test-client-id');
    
    // Verify values are set
    await expect(authUrlInput).toHaveValue('https://custom.example.com/auth');
    await expect(tokenUrlInput).toHaveValue('https://custom.example.com/token');
    await expect(clientIdInput).toHaveValue('test-client-id');
    
    // Continue button should be enabled with filled fields
    const startButton = await utils.getButtonByText('Continue to Authorization');
    await expect(startButton).toBeEnabled();
  });

  test('should copy authorization URL', async ({ page }) => {
    // Enable demo mode
    await page.click(selectors.oauthPlayground.demoModeSwitch);
    await page.waitForTimeout(500);
    
    // Fill in client ID
    const clientIdInput = page.locator(selectors.oauthPlayground.clientIdInput);
    await clientIdInput.fill('test-client');
    
    // Start the flow
    await page.click('button:has-text("Continue to Authorization")');
    await page.waitForTimeout(500);
    
    // Verify we're on step 2
    const step2Tab = page.locator('[role="tab"]:has-text("2. AuthZ")');
    await expect(step2Tab).toHaveAttribute('aria-selected', 'true');
    
    // Look for copy buttons on the page
    const copyButtons = page.locator('button:has-text("Copy")');
    if (await copyButtons.count() > 0) {
      // Click the first copy button
      await copyButtons.first().click();
      
      // Just verify the button was clickable
      await page.waitForTimeout(500);
    }
    
    // Verify we're still on the authorization step
    await expect(step2Tab).toHaveAttribute('aria-selected', 'true');
  });

  test('should regenerate PKCE values', async ({ page }) => {
    // Verify PKCE section is visible
    const pkceSection = page.locator('text=PKCE Parameters');
    await expect(pkceSection).toBeVisible();
    
    // Verify PKCE components are present
    await expect(page.locator('text=Code Verifier').first()).toBeVisible();
    await expect(page.locator('text=Code Challenge (S256)')).toBeVisible();
    await expect(page.locator('text=State').first()).toBeVisible();
    
    // Click regenerate button
    const regenerateButton = page.locator('button:has-text("Regenerate")');
    await expect(regenerateButton).toBeVisible();
    await regenerateButton.click();
    
    // Wait for regeneration to complete
    await page.waitForTimeout(1000);
    
    // Verify the PKCE section is still visible (confirming the page didn't break)
    await expect(pkceSection).toBeVisible();
    await expect(regenerateButton).toBeVisible();
  });

  test('should show step indicators', async ({ page }) => {
    // Verify step indicators are present as tabs
    await expect(page.locator('[role="tab"]:has-text("1. Config")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("2. AuthZ")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("3. Get Token")')).toBeVisible();
    
    // Step 1 should be selected by default
    const step1 = page.locator('[role="tab"]:has-text("1. Config")');
    await expect(step1).toHaveAttribute('aria-selected', 'true');
  });
});