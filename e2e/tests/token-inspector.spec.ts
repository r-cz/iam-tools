import { test, expect } from '@playwright/test';
import { TestUtils } from '../helpers/test-utils';
import { selectors } from '../helpers/selectors';

test.describe('Token Inspector', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.navigateTo('/token-inspector');
  });

  test('should load token inspector page', async ({ page }) => {
    await expect(page).toHaveTitle(/iam\.tools/);
    await expect(page.locator('text=OAuth/OIDC Token Inspector')).toBeVisible();
  });

  test('should have disabled inspect button initially', async () => {
    const inspectButton = await utils.getButtonByText('Inspect Token');
    await expect(inspectButton).toBeDisabled();
  });

  test('should generate and inspect example token', async ({ page }) => {
    // Click Example button
    await utils.clickAndWait(selectors.buttons.example);
    
    // Wait for toast notification
    await utils.waitForToast('success');
    
    // Verify token is populated
    const tokenInput = page.locator(selectors.tokenInspector.tokenInput);
    const tokenValue = await tokenInput.inputValue();
    expect(tokenValue).toBeTruthy();
    expect(tokenValue).toContain('eyJ');
    
    // Inspect button should be enabled
    await utils.waitForButtonEnabled('Inspect Token');
    
    // Click Inspect Token
    await utils.clickAndWait(selectors.buttons.inspectToken);
    
    // Verify signature valid message appears
    await utils.waitForTextVisible('Signature Valid');
    await utils.waitForTextVisible('Demo Token');
    
    // Verify tabs are present
    await expect(page.locator(selectors.tokenInspector.headerTab)).toBeVisible();
    await expect(page.locator(selectors.tokenInspector.payloadTab)).toBeVisible();
    await expect(page.locator(selectors.tokenInspector.signatureTab)).toBeVisible();
    await expect(page.locator(selectors.tokenInspector.timelineTab)).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Generate example token and inspect it
    await utils.clickAndWait(selectors.buttons.example);
    await utils.waitForButtonEnabled('Inspect Token');
    await utils.clickAndWait(selectors.buttons.inspectToken);
    
    // Default should be Payload tab
    await expect(page.locator('[role="tabpanel"][aria-labelledby*="Payload"]')).toBeVisible();
    
    // Switch to Header tab
    await page.click(selectors.tokenInspector.headerTab);
    await expect(page.locator('[role="tabpanel"][aria-labelledby*="Header"]')).toBeVisible();
    
    // Switch to Signature tab
    await page.click(selectors.tokenInspector.signatureTab);
    await expect(page.locator('[role="tabpanel"][aria-labelledby*="Signature"]')).toBeVisible();
    
    // Switch to Timeline tab
    await page.click(selectors.tokenInspector.timelineTab);
    await expect(page.locator('[role="tabpanel"][aria-labelledby*="Timeline"]')).toBeVisible();
  });

  test('should reset token input', async ({ page }) => {
    // Generate example token
    await utils.clickAndWait(selectors.buttons.example);
    
    // Verify token is populated
    const tokenInput = page.locator(selectors.tokenInspector.tokenInput);
    let tokenValue = await tokenInput.inputValue();
    expect(tokenValue).toBeTruthy();
    
    // Click Reset
    await page.click(selectors.buttons.reset);
    
    // Verify token is cleared
    tokenValue = await tokenInput.inputValue();
    expect(tokenValue).toBe('');
    
    // Inspect button should be disabled again
    const inspectButton = await utils.getButtonByText('Inspect Token');
    await expect(inspectButton).toBeDisabled();
  });

  test('should handle invalid token', async ({ page }) => {
    // Enter invalid token
    await utils.fillInput(selectors.tokenInspector.tokenInput, 'invalid-token');
    
    // Should show error message immediately
    await expect(page.locator('text=Invalid token: Invalid JWT format')).toBeVisible();
    
    // Inspect button should still be enabled
    await utils.waitForButtonEnabled('Inspect Token');
  });

  test('should display token size', async ({ page }) => {
    // Generate and inspect example token
    await utils.clickAndWait(selectors.buttons.example);
    await utils.waitForButtonEnabled('Inspect Token');
    await utils.clickAndWait(selectors.buttons.inspectToken);
    
    // Token size button should be visible
    await expect(page.locator(selectors.tokenInspector.tokenSize)).toBeVisible();
    
    // Click token size button to expand details
    await page.click(selectors.tokenInspector.tokenSize);
    
    // Should show size breakdown
    await expect(page.locator('text=Header size')).toBeVisible();
    await expect(page.locator('text=Payload size')).toBeVisible();
    await expect(page.locator('text=Signature size')).toBeVisible();
  });

  test('should show token claims details', async ({ page }) => {
    // Generate and inspect example token
    await utils.clickAndWait(selectors.buttons.example);
    await utils.waitForButtonEnabled('Inspect Token');
    await utils.clickAndWait(selectors.buttons.inspectToken);
    
    // Verify common claims are displayed
    await expect(page.locator('text=iss')).toBeVisible();
    await expect(page.locator('text=sub')).toBeVisible();
    await expect(page.locator('text=aud')).toBeVisible();
    await expect(page.locator('text=iat')).toBeVisible();
    await expect(page.locator('text=exp')).toBeVisible();
    
    // Verify claim descriptions are present
    await expect(page.locator('text=Issuer Identifier')).toBeVisible();
    await expect(page.locator('text=Subject Identifier')).toBeVisible();
    await expect(page.locator('text=Audience')).toBeVisible();
  });

  test('should handle paste functionality', async ({ page }) => {
    // Generate an example token first
    await utils.clickAndWait(selectors.buttons.example);
    const tokenInput = page.locator(selectors.tokenInspector.tokenInput);
    const exampleToken = await tokenInput.inputValue();
    
    // Clear the token
    await page.click(selectors.buttons.reset);
    
    // Copy token to clipboard
    await page.evaluate((token) => {
      navigator.clipboard.writeText(token);
    }, exampleToken);
    
    // Click Paste button
    await page.click(selectors.buttons.paste);
    
    // Verify token is pasted
    const pastedValue = await tokenInput.inputValue();
    expect(pastedValue).toBe(exampleToken);
  });
});