import { test, expect } from '@playwright/test';

test.describe('Token Inspector E2E Tests', () => {
  test('should display decoded token parts after pasting a JWT', async ({ page }) => {
    // Navigate to the Token Inspector page
    // You might need to adjust the URL based on your application's routing
    await page.goto('/token-inspector'); // Use relative path to utilize baseURL

    // Sample JWT (Header: {"alg":"HS256","typ":"JWT"}, Payload: {"sub":"1234567890","name":"John Doe","iat":1516239022})
    const sampleJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    // Find the token input area and paste the JWT
    // You might need to adjust the selector based on your component's structure
    const tokenInput = page.locator('textarea#token-input'); // Use the correct ID selector
    await tokenInput.fill(sampleJwt);

    // Click the Header tab to ensure it's active first
    await page.click('button[role="tab"]:has-text("Header")');

    // Define selector for the active tab panel content area
    const activeTabPanelSelector = '[role="tabpanel"][data-state="active"]';

    // Wait for the header tab panel to become active and visible
    await page.waitForSelector(activeTabPanelSelector, { state: 'visible', timeout: 60000 }); // Wait for the panel itself
    const headerTabPanel = page.locator(activeTabPanelSelector); // Get locator for the active panel

    // Assert that the header tab panel contains expected header content
    await expect(headerTabPanel).toContainText('"alg": "HS256"'); // Check for part of the JSON

    // Click the Payload tab to make it active
    await page.click('button[role="tab"]:has-text("Payload")');

    // Wait for the payload tab panel to become active and visible
    // The activeTabPanelSelector will now match the payload panel
    await page.waitForSelector(activeTabPanelSelector, { state: 'visible', timeout: 60000 }); // Wait for the panel itself
    const payloadTabPanel = page.locator(activeTabPanelSelector); // Get locator for the now active panel

    // Assert that the payload tab panel contains expected payload content
    await expect(payloadTabPanel).toContainText('"sub": "1234567890"'); // Check for part of the JSON
    await expect(payloadTabPanel).toContainText('"name": "John Doe"');
  });
});