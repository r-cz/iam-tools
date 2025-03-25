import { test, expect } from '@playwright/test';

// Test the CORS proxy functionality
test.describe('CORS Proxy', () => {
  // Test the token inspector with signature verification flow
  test('should inspect token and access signature tab', async ({ page }) => {
    // Navigate to the token inspector page
    await page.goto('/token-inspector');
    
    // Click the Example button to load a sample token
    await page.getByRole('button', { name: 'Example' }).click();
    
    // Wait briefly for the token to load in the textarea
    await page.waitForTimeout(500);
    
    // Click the Inspect Token button
    await page.getByRole('button', { name: 'Inspect Token' }).click();
    
    // Wait for decoded content to appear - specifically the tabs
    await page.waitForSelector('button[role="tab"]', { timeout: 10000 });
    
    // Make sure we have the tabs we expect
    await expect(page.getByRole('tab', { name: 'Header' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Payload' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Signature' })).toBeVisible();
    
    // Click on the Signature tab
    await page.getByRole('tab', { name: 'Signature' }).click();
    
    // Verify the signature tab content appears
    await expect(page.getByText('JWKS Configuration')).toBeVisible({ timeout: 5000 });
    
    // Enter a sample issuer URL that requires CORS proxy
    await page.locator('#issuer-url').fill('https://login.microsoftonline.com/common/v2.0');
    
    // Click the Fetch JWKS button
    await page.getByRole('button', { name: 'Fetch JWKS' }).click();
    
    // Wait for a moment to allow the fetch to start
    await page.waitForTimeout(1000);
    
    // Test passes if we reach this point without errors
  });
  
  // Test for Cloudflare Functions API - skip in local dev environment
  test.skip('should fetch data through CORS proxy', async ({ request }) => {
    // NOTE: This test is skipped in local development because Cloudflare Functions
    // are not available in the Vite dev server. This test would only work in a 
    // production or staging environment where the Cloudflare Functions are deployed.
    
    // Set up test parameters
    const testUrl = 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration';
    const encodedUrl = encodeURIComponent(testUrl);
    const proxyUrl = `/api/cors-proxy/${encodedUrl}`;
    
    console.log(`Testing proxy URL: ${proxyUrl}`);
    
    // Make the request directly using Playwright's request API
    const response = await request.get(proxyUrl);
    
    // Log response details for debugging
    console.log(`Proxy request status: ${response.status()}`);
    
    // Check if we got a successful response
    expect(response.status()).toBe(200);
    
    // Verify content type header contains application/json
    const contentType = response.headers()['content-type'] || '';
    expect(contentType.includes('application/json')).toBeTruthy();
    
    // Verify we can parse the response as JSON
    const responseBody = await response.json();
    expect(responseBody).toBeTruthy();
  });
});
