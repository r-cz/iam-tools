import { test, expect, TEST_TOKENS } from '../utils/test-utils';

test.describe('Token Inspector', () => {
  test.beforeEach(async ({ tokenInspectorPage }) => {
    await tokenInspectorPage.goto();
  });

  test('should display token components when a valid token is entered', async ({ tokenInspectorPage }) => {
    await tokenInspectorPage.enterToken(TEST_TOKENS.VALID);
    
    await tokenInspectorPage.verifyHeaderVisible();
    await tokenInspectorPage.verifyPayloadVisible();
    await tokenInspectorPage.verifySignatureVisible();
    await tokenInspectorPage.verifyTimelineVisible();
  });

  test('should clear token input when clear button is clicked', async ({ tokenInspectorPage }) => {
    await tokenInspectorPage.enterToken(TEST_TOKENS.VALID);
    await tokenInspectorPage.clearToken();
  });

  test('should show error for malformed token', async ({ tokenInspectorPage, page }) => {
    await tokenInspectorPage.enterToken(TEST_TOKENS.MALFORMED);
    
    const errorMessage = page.getByText(/invalid token format/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should show token history', async ({ tokenInspectorPage, page }) => {
    // Add a token to history
    await tokenInspectorPage.enterToken(TEST_TOKENS.VALID);
    
    // Open history
    await tokenInspectorPage.openHistory();
    
    // Check if token is in history
    const historyDialog = page.getByRole('dialog');
    await expect(historyDialog).toBeVisible();
    await expect(historyDialog).toContainText('JWT History');
    
    // History should contain our token (at least part of it)
    const tokenStart = TEST_TOKENS.VALID.substring(0, 20);
    await expect(historyDialog).toContainText(tokenStart);
  });

  test('should display expiration status for tokens', async ({ tokenInspectorPage, page }) => {
    // Test with valid (non-expired) token
    await tokenInspectorPage.enterToken(TEST_TOKENS.VALID);
    await expect(page.getByText(/valid/i)).toBeVisible();
    
    // Test with expired token
    await tokenInspectorPage.enterToken(TEST_TOKENS.EXPIRED);
    await expect(page.getByText(/expired/i)).toBeVisible();
  });
});