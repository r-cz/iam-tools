import { test, expect } from '@playwright/test';

// Test the CORS proxy functionality
test.describe('CORS Proxy', () => {
  // Test fetching well-known configuration
  test('should proxy well-known configuration requests', async ({ page }) => {
    // Navigate to the token inspector page
    await page.goto('/token-inspector');
    
    // Enter a sample issuer URL that requires CORS proxy
    await page.fill('input#issuer-url', 'https://secure.southwest.com');
    
    // Click the fetch button
    await page.click('button:has-text("Fetch JWKS")');
    
    // Wait for the request to complete (either success or error)
    await page.waitForSelector('text="Fetching..." >> visible=false');
    
    // Check if we got a CORS error
    const errorElement = await page.$('text="CORS error"');
    
    // We should not see a CORS error if our proxy is working
    expect(errorElement).toBeNull();
  });
  
  // Test direct access to proxy endpoint
  test('should access proxy endpoint directly', async ({ request }) => {
    // Create a well-known URL to test
    const testUrl = encodeURIComponent('https://accounts.google.com/.well-known/openid-configuration');
    
    // Send a request to our proxy
    const response = await request.get(`/api/cors-proxy/${testUrl}`);
    
    // Check if the response is successful
    expect(response.ok()).toBeTruthy();
    
    // Verify that we got the expected content type
    expect(response.headers()['content-type']).toContain('application/json');
    
    // Parse the response body
    const body = await response.json();
    
    // Verify that the response contains expected OpenID configuration fields
    expect(body).toHaveProperty('issuer');
    expect(body).toHaveProperty('authorization_endpoint');
    expect(body).toHaveProperty('token_endpoint');
    expect(body).toHaveProperty('jwks_uri');
  });
});
