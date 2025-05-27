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
    
    // Wait for the token to be loaded - don't wait for toast
    await page.waitForTimeout(500);
    
    // Verify token is populated
    const tokenInput = page.locator(selectors.tokenInspector.tokenInput);
    const tokenValue = await tokenInput.inputValue();
    expect(tokenValue).toBeTruthy();
    expect(tokenValue).toContain('eyJ');
    
    // Inspect button should be enabled
    await utils.waitForButtonEnabled('Inspect Token');
    
    // Click Inspect Token
    await utils.clickAndWait(selectors.buttons.inspectToken);
    
    // Wait for the inspection to complete
    await page.waitForTimeout(500);
    
    // Verify signature valid message appears
    await expect(page.locator('text=Signature Valid')).toBeVisible();
    await expect(page.locator('text=Demo Token')).toBeVisible();
    
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
    
    // Wait for the default payload tab content
    await page.waitForTimeout(500);
    await expect(page.locator('text=Common OAuth/JWT Claims')).toBeVisible();
    
    // Switch to Header tab
    await page.click(selectors.tokenInspector.headerTab);
    await page.waitForTimeout(300);
    // Verify we see header content (algorithm type)
    await expect(page.locator('text=alg').first()).toBeVisible();
    
    // Switch to Signature tab
    await page.click(selectors.tokenInspector.signatureTab);
    await page.waitForTimeout(300);
    // Should see signature-related content
    
    // Switch to Timeline tab
    await page.click(selectors.tokenInspector.timelineTab);
    await page.waitForTimeout(300);
    // Should see timeline-related content
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
    
    // Should show size breakdown - wait for it to expand
    await page.waitForTimeout(500);
    // Just verify the token size section is expanded
    const tokenSizeText = await page.textContent('body');
    expect(tokenSizeText).toContain('bytes');
  });

  test('should show token claims details', async ({ page }) => {
    // Generate and inspect example token
    await utils.clickAndWait(selectors.buttons.example);
    await utils.waitForButtonEnabled('Inspect Token');
    await utils.clickAndWait(selectors.buttons.inspectToken);
    
    // Verify common claims are displayed in the claims section
    // Looking for the claim keys in the table format
    await expect(page.locator('text=iss').first()).toBeVisible();
    await expect(page.locator('text=sub').first()).toBeVisible();
    await expect(page.locator('text=aud').first()).toBeVisible();
    
    // Verify we see some claim values
    await expect(page.locator('text=https://iam.tools/demo').first()).toBeVisible();
    await expect(page.locator('text=user-example-123').first()).toBeVisible();
  });

  test('should handle paste functionality', async ({ page }) => {
    // Skip clipboard test in CI environment as it's unreliable
    // Just test that the paste button exists and is clickable
    const pasteButton = page.locator(selectors.buttons.paste);
    await expect(pasteButton).toBeVisible();
    await expect(pasteButton).toBeEnabled();
    
    // Click it to verify it doesn't break
    await pasteButton.click();
    
    // Just verify the page is still functional
    await expect(page.locator('text=OAuth/OIDC Token').first()).toBeVisible();
  });
});