import { test, expect } from '@playwright/test';
import { TestUtils } from '../helpers/test-utils';
import { selectors } from '../helpers/selectors';

test.describe('OIDC Explorer', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.navigateTo('/oidc-explorer');
  });

  test('should load OIDC explorer page', async ({ page }) => {
    await expect(page).toHaveTitle(/iam\.tools/);
    await expect(page.locator('text=OIDC Configuration Explorer')).toBeVisible();
  });

  test('should have disabled fetch button initially', async ({ page }) => {
    const fetchButton = await utils.getButtonByText('Fetch Config');
    await expect(fetchButton).toBeDisabled();
  });

  test('should load random example provider', async ({ page }) => {
    // Click random example button
    await page.click(selectors.oidcExplorer.randomExample);
    
    // Verify URL input is populated
    const urlInput = page.locator(selectors.oidcExplorer.urlInput);
    const urlValue = await urlInput.inputValue();
    expect(urlValue).toBeTruthy();
    expect(urlValue).toMatch(/^https?:\/\//);
    
    // Fetch button should be enabled
    await utils.waitForButtonEnabled('Fetch Config');
  });

  test('should fetch OIDC configuration for demo endpoint', async ({ page }) => {
    // Enter demo OIDC URL
    const demoUrl = 'https://iam.tools/demo';
    await utils.fillInput(selectors.oidcExplorer.urlInput, demoUrl);
    
    // Fetch button should be enabled
    await utils.waitForButtonEnabled('Fetch Config');
    
    // Click Fetch Config
    await page.click(selectors.buttons.fetchConfig);
    
    // Wait for configuration to load
    await utils.waitForToast('success');
    
    // Verify configuration sections are displayed
    await expect(page.locator('text=OpenID Provider Information')).toBeVisible();
    await expect(page.locator('text=OIDC Configuration')).toBeVisible();
    await expect(page.locator('text=JWKS')).toBeVisible();
  });

  test('should display configuration details', async ({ page }) => {
    // Fetch demo configuration
    await utils.fillInput(selectors.oidcExplorer.urlInput, 'https://iam.tools/demo');
    await utils.waitForButtonEnabled('Fetch Config');
    await page.click(selectors.buttons.fetchConfig);
    
    // Wait for configuration to load
    await utils.waitForToast('success');
    
    // Verify key configuration fields are present
    await expect(page.locator('text=issuer')).toBeVisible();
    await expect(page.locator('text=authorization_endpoint')).toBeVisible();
    await expect(page.locator('text=token_endpoint')).toBeVisible();
    await expect(page.locator('text=jwks_uri')).toBeVisible();
    
    // Verify JWKS data is displayed
    await expect(page.locator('text=keys')).toBeVisible();
  });

  test('should handle invalid OIDC URL', async ({ page }) => {
    // Enter invalid URL
    await utils.fillInput(selectors.oidcExplorer.urlInput, 'https://invalid.example.com');
    
    // Click Fetch Config
    await utils.waitForButtonEnabled('Fetch Config');
    await page.click(selectors.buttons.fetchConfig);
    
    // Should show error message
    await utils.waitForToast('error');
  });

  test('should detect known providers', async ({ page }) => {
    // Test with Google
    await utils.fillInput(selectors.oidcExplorer.urlInput, 'https://accounts.google.com');
    await utils.waitForButtonEnabled('Fetch Config');
    await page.click(selectors.buttons.fetchConfig);
    
    // Wait for configuration to load
    await utils.waitForToast('success');
    
    // Should detect Google as provider
    await expect(page.locator('text=Google')).toBeVisible();
  });

  test('should copy configuration to clipboard', async ({ page }) => {
    // Fetch demo configuration
    await utils.fillInput(selectors.oidcExplorer.urlInput, 'https://iam.tools/demo');
    await utils.waitForButtonEnabled('Fetch Config');
    await page.click(selectors.buttons.fetchConfig);
    
    // Wait for configuration to load
    await utils.waitForToast('success');
    
    // Click copy button
    const copyButton = page.locator('button[aria-label*="Copy"]').first();
    await copyButton.click();
    
    // Should show success toast
    await utils.waitForToast('success');
  });

  test('should expand/collapse configuration sections', async ({ page }) => {
    // Fetch demo configuration
    await utils.fillInput(selectors.oidcExplorer.urlInput, 'https://iam.tools/demo');
    await utils.waitForButtonEnabled('Fetch Config');
    await page.click(selectors.buttons.fetchConfig);
    
    // Wait for configuration to load
    await utils.waitForToast('success');
    
    // Find collapsible sections
    const collapsibleButtons = page.locator('button[aria-expanded]');
    const count = await collapsibleButtons.count();
    
    // Test first collapsible section
    if (count > 0) {
      const firstButton = collapsibleButtons.first();
      const isExpanded = await firstButton.getAttribute('aria-expanded');
      
      // Toggle the section
      await firstButton.click();
      
      // Verify state changed
      const newState = await firstButton.getAttribute('aria-expanded');
      expect(newState).not.toBe(isExpanded);
    }
  });

  test('should clear input and disable fetch button', async ({ page }) => {
    // Enter URL
    await utils.fillInput(selectors.oidcExplorer.urlInput, 'https://iam.tools/demo');
    await utils.waitForButtonEnabled('Fetch Config');
    
    // Clear input
    await page.locator(selectors.oidcExplorer.urlInput).clear();
    
    // Fetch button should be disabled
    const fetchButton = await utils.getButtonByText('Fetch Config');
    await expect(fetchButton).toBeDisabled();
  });

  test('should validate URL format', async ({ page }) => {
    // Enter invalid URL format
    await utils.fillInput(selectors.oidcExplorer.urlInput, 'not-a-url');
    
    // Fetch button should remain disabled
    const fetchButton = await utils.getButtonByText('Fetch Config');
    await expect(fetchButton).toBeDisabled();
    
    // Enter valid URL format
    await page.locator(selectors.oidcExplorer.urlInput).clear();
    await utils.fillInput(selectors.oidcExplorer.urlInput, 'https://example.com');
    
    // Fetch button should be enabled
    await utils.waitForButtonEnabled('Fetch Config');
  });
});