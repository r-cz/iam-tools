# Mocking API Responses in Playwright Tests

This guide covers techniques for mocking API responses in IAM Tools Playwright tests, essential for testing components that interact with external services like OIDC providers or OAuth servers.

## Table of Contents

- [Why Mock API Responses](#why-mock-api-responses)
- [Basic Request Interception](#basic-request-interception)
- [Testing Error Scenarios](#testing-error-scenarios)
- [Working with the CORS Proxy](#working-with-the-cors-proxy)
- [Helper Functions for Common Mocks](#helper-functions-for-common-mocks)
- [JWT and JWKS Mocking](#jwt-and-jwks-mocking)
- [OAuth Flow Mocking](#oauth-flow-mocking)
- [Recording and Replaying Real API Responses](#recording-and-replaying-real-api-responses)
- [Advanced Mocking Techniques](#advanced-mocking-techniques)
- [Best Practices](#best-practices)

## Why Mock API Responses

Mocking API responses in tests provides several benefits:

1. **Deterministic tests**: Tests run with consistent data
2. **Independence**: No reliance on external services
3. **Speed**: Tests run faster without real API calls
4. **Coverage**: Test error cases and edge conditions
5. **Offline development**: Develop and test without internet access

## Basic Request Interception

### Mocking a Successful Response

```typescript
import { test, expect } from '@playwright/test';
import { OidcExplorerPage } from '../pages/oidc-explorer-page';

test('fetches and displays OIDC configuration', async ({ page }) => {
  // Mock the OIDC configuration endpoint
  await page.route('**/api/cors-proxy/**/.well-known/openid-configuration', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        issuer: 'https://example.com',
        authorization_endpoint: 'https://example.com/authorize',
        token_endpoint: 'https://example.com/token',
        userinfo_endpoint: 'https://example.com/userinfo',
        jwks_uri: 'https://example.com/.well-known/jwks.json',
        response_types_supported: ['code', 'id_token', 'token'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256']
      })
    });
  });
  
  // Use the page object
  const oidcPage = new OidcExplorerPage(page);
  await oidcPage.navigate();
  
  // Enter the configuration URL and fetch
  await oidcPage.fetchConfiguration('https://example.com/.well-known/openid-configuration');
  
  // Verify the mocked response is displayed
  await expect(oidcPage.issuerValue).toContainText('https://example.com');
  await expect(oidcPage.getEndpointValue('authorization_endpoint'))
    .toContainText('https://example.com/authorize');
});
```

### Intercepting Multiple Endpoints

When testing features that make multiple API calls:

```typescript
test('verifies token signature with JWKS', async ({ page }) => {
  // Step 1: Mock the JWKS URI endpoint
  await page.route('**/api/cors-proxy/**/.well-known/jwks.json', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        keys: [{
          kty: 'RSA',
          use: 'sig',
          kid: 'test-key-id',
          n: 'test-modulus',
          e: 'AQAB',
          alg: 'RS256'
        }]
      })
    });
  });
  
  // Test implementation continues...
  const tokenPage = new TokenInspectorPage(page);
  await tokenPage.navigate();
  await tokenPage.enterToken(testTokens.validRsa);
  await tokenPage.enterJwksUrl('https://example.com/.well-known/jwks.json');
  await tokenPage.clickVerifySignature();
  
  // Verify signature validation result
  await expect(tokenPage.verificationStatus).toContainText('Valid Signature');
});
```

### Conditional Response Mocking

Vary responses based on request parameters:

```typescript
test('handles different token types', async ({ page }) => {
  // Mock token endpoint with conditional responses
  await page.route('**/token', async (route) => {
    const postData = route.request().postDataJSON();
    
    if (postData.grant_type === 'client_credentials') {
      // Return access token only for client credentials
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });
    } else if (postData.grant_type === 'authorization_code') {
      // Return access token and id token for auth code
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          id_token: 'mock-id-token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });
    } else {
      // Unsupported grant type
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'unsupported_grant_type'
        })
      });
    }
  });
  
  // Test continues with OAuth playground flow...
});
```

## Testing Error Scenarios

### Mocking Error Responses

Test how your application handles API errors:

```typescript
test('handles OIDC configuration fetch errors', async ({ page }) => {
  // Mock 404 Not Found response
  await page.route('**/api/cors-proxy/**', (route) => {
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Not Found' })
    });
  });
  
  const oidcPage = new OidcExplorerPage(page);
  await oidcPage.navigate();
  await oidcPage.fetchConfiguration('https://example.com/.well-known/openid-configuration');
  
  // Verify error handling
  await expect(oidcPage.errorMessage).toBeVisible();
  await expect(oidcPage.errorMessage).toContainText('Configuration not found');
});

test('handles network timeouts', async ({ page }) => {
  // Mock a network timeout by never resolving
  await page.route('**/api/cors-proxy/**', (route) => {
    // Never resolve to simulate timeout
    // The test will rely on Playwright's test timeout
  });
  
  const oidcPage = new OidcExplorerPage(page);
  await oidcPage.navigate();
  await oidcPage.fetchConfiguration('https://example.com/.well-known/openid-configuration');
  
  // Verify timeout handling
  await expect(oidcPage.errorMessage).toBeVisible();
  await expect(oidcPage.errorMessage).toContainText('Request timed out');
});
```

### Testing Rate Limiting

Simulate rate-limit responses:

```typescript
test('handles rate limiting gracefully', async ({ page }) => {
  // Mock rate limit response
  await page.route('**/api/cors-proxy/**', (route) => {
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: {
        'Retry-After': '60'
      },
      body: JSON.stringify({ error: 'Too Many Requests' })
    });
  });
  
  const oidcPage = new OidcExplorerPage(page);
  await oidcPage.navigate();
  await oidcPage.fetchConfiguration('https://example.com/.well-known/openid-configuration');
  
  // Verify rate limit handling
  await expect(oidcPage.errorMessage).toBeVisible();
  await expect(oidcPage.errorMessage).toContainText('Rate limit exceeded');
  await expect(oidcPage.retryMessage).toContainText('60 seconds');
});
```

## Working with the CORS Proxy

IAM Tools uses a CORS proxy for external API access, which requires special consideration in tests.

### Mocking the CORS Proxy

```typescript
test('correctly proxies requests through CORS proxy', async ({ page }) => {
  // Track proxy requests
  let proxyUrl;
  
  await page.route('**/api/cors-proxy/**', (route) => {
    proxyUrl = route.request().url();
    
    // Extract the target URL from the proxy request
    const targetUrl = proxyUrl.replace(/.*\/api\/cors-proxy\//, '');
    
    // Mock the response
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        // Response depends on what endpoint is being accessed
        ...(targetUrl.includes('openid-configuration') ? oidcConfigMock : jwksMock)
      })
    });
  });
  
  // Implement the test...
  
  // Verify the proxy was used correctly
  expect(proxyUrl).toContain('/api/cors-proxy/');
  expect(proxyUrl).toContain('example.com/.well-known/openid-configuration');
});
```

### Testing Proxy Error Handling

```typescript
test('handles CORS proxy errors gracefully', async ({ page }) => {
  // Simulate proxy server error
  await page.route('**/api/cors-proxy/**', (route) => {
    route.fulfill({
      status: 500,
      contentType: 'text/plain',
      body: 'Internal server error'
    });
  });
  
  const oidcPage = new OidcExplorerPage(page);
  await oidcPage.navigate();
  await oidcPage.fetchConfiguration('https://example.com/.well-known/openid-configuration');
  
  // Verify error handling for proxy errors
  await expect(oidcPage.errorMessage).toBeVisible();
  await expect(oidcPage.errorMessage).toContainText('proxy error');
});
```

## Helper Functions for Common Mocks

Create reusable mock helpers for common API responses:

### OIDC Configuration Mock Helper

```typescript
// playwright/utils/mock-helpers.ts
import { Page } from '@playwright/test';

export interface OidcConfigOptions {
  issuer?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  jwksUri?: string;
  // Add other configuration options as needed
}

export async function mockOidcConfig(page: Page, options: OidcConfigOptions = {}) {
  const baseUrl = options.issuer || 'https://example.com';
  
  const mockConfig = {
    issuer: baseUrl,
    authorization_endpoint: options.authorizationEndpoint || `${baseUrl}/authorize`,
    token_endpoint: options.tokenEndpoint || `${baseUrl}/token`,
    userinfo_endpoint: options.userinfoEndpoint || `${baseUrl}/userinfo`,
    jwks_uri: options.jwksUri || `${baseUrl}/.well-known/jwks.json`,
    response_types_supported: ['code', 'id_token', 'token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'email', 'profile'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    claims_supported: ['sub', 'aud', 'iss', 'name', 'email'],
  };
  
  // Route any OIDC config URL through the proxy
  await page.route('**/api/cors-proxy/**/.well-known/openid-configuration', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockConfig)
    });
  });
  
  return mockConfig;
}

export async function mockJwks(page: Page, keys = []) {
  const defaultKey = {
    kty: 'RSA',
    use: 'sig',
    kid: 'test-key-id',
    n: 'test-modulus-value',
    e: 'AQAB',
    alg: 'RS256'
  };
  
  const mockJwks = {
    keys: keys.length > 0 ? keys : [defaultKey]
  };
  
  await page.route('**/api/cors-proxy/**/.well-known/jwks.json', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockJwks)
    });
  });
  
  return mockJwks;
}
```

### Using the Helpers in Tests

```typescript
import { test, expect } from '@playwright/test';
import { OidcExplorerPage } from '../pages/oidc-explorer-page';
import { mockOidcConfig, mockJwks } from '../utils/mock-helpers';

test('fetches configuration and JWKS', async ({ page }) => {
  // Set up mocks
  const configMock = await mockOidcConfig(page, {
    issuer: 'https://test-idp.example.com'
  });
  
  await mockJwks(page, [
    {
      kty: 'RSA',
      kid: 'test-kid-1',
      use: 'sig',
      n: 'test-modulus-1',
      e: 'AQAB'
    },
    {
      kty: 'RSA',
      kid: 'test-kid-2',
      use: 'sig',
      n: 'test-modulus-2',
      e: 'AQAB'
    }
  ]);
  
  // Test implementation
  const oidcPage = new OidcExplorerPage(page);
  await oidcPage.navigate();
  await oidcPage.fetchConfiguration('https://test-idp.example.com/.well-known/openid-configuration');
  
  // Verify configuration is displayed
  await expect(oidcPage.issuerValue).toContainText(configMock.issuer);
  
  // Fetch and verify JWKS
  await oidcPage.clickFetchJwks();
  await expect(oidcPage.jwksKeyCount).toContainText('2 keys');
  await expect(oidcPage.getKeyProperty('kid', 0)).toContainText('test-kid-1');
});
```

## JWT and JWKS Mocking

### Mocking Tokens and Keys

Create helper functions for JWT and JWKS testing:

```typescript
// playwright/utils/jwt-helpers.ts
import { Page } from '@playwright/test';

// Mock tokens with different properties
export const mockTokens = {
  // Standard token with common claims
  standard: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  
  // Token with expiration one hour in the future
  active: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Xd8iCRkanADGMNiPRsn8g5LUhXOXYZ01py0wWUfBXtA',
  
  // Expired token
  expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4yswhUVvF3p7lSQyGKUM88HmYxYFNxgpgI4BFoMGEhE',
  
  // RSA-signed token with specific key ID
  rsa: 'eyJhbGciOiJSUzI1NiIsImtpZCI6InRlc3Qta2lkIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.signature-placeholder'
};

// Mock a token introspection endpoint
export async function mockTokenIntrospection(page: Page, response = {}) {
  const defaultResponse = {
    active: true,
    client_id: 'test-client',
    username: 'test-user',
    scope: 'openid profile',
    sub: '1234567890',
    aud: 'test-audience',
    iss: 'https://example.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000) - 60
  };
  
  await page.route('**/introspect', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...defaultResponse, ...response })
    });
  });
}
```

### Using JWT Mocks in Tests

```typescript
import { test, expect } from '@playwright/test';
import { TokenInspectorPage } from '../pages/token-inspector-page';
import { mockTokens, mockTokenIntrospection } from '../utils/jwt-helpers';
import { mockJwks } from '../utils/mock-helpers';

test('token verification with JWKS', async ({ page }) => {
  // Setup mocks
  await mockJwks(page, [
    {
      kty: 'RSA',
      kid: 'test-kid',
      use: 'sig',
      n: 'test-modulus',
      e: 'AQAB',
      alg: 'RS256'
    }
  ]);
  
  // Use the page object
  const tokenPage = new TokenInspectorPage(page);
  await tokenPage.navigate();
  await tokenPage.enterToken(mockTokens.rsa);
  await tokenPage.enterJwksUrl('https://example.com/.well-known/jwks.json');
  await tokenPage.clickVerifySignature();
  
  // Since we can't actually verify the signature in a mock, we just check the UI flow
  // In a real test, we'd need to use a token signed with a known key
  await expect(tokenPage.verificationStatus).not.toContainText('Invalid Signature');
});

test('displays introspection results', async ({ page }) => {
  // Setup mock for introspection endpoint
  await mockTokenIntrospection(page, { 
    active: true,
    scope: 'read write',
    client_id: 'special-client'
  });
  
  // Test implementation
  const tokenPage = new TokenInspectorPage(page);
  await tokenPage.navigate();
  await tokenPage.enterToken(mockTokens.standard);
  await tokenPage.goToIntrospectionTab();
  await tokenPage.enterIntrospectionEndpoint('https://example.com/introspect');
  await tokenPage.clickIntrospect();
  
  // Verify introspection results are displayed
  await expect(tokenPage.getIntrospectionResult('active')).toContainText('true');
  await expect(tokenPage.getIntrospectionResult('scope')).toContainText('read write');
  await expect(tokenPage.getIntrospectionResult('client_id')).toContainText('special-client');
});
```

## OAuth Flow Mocking

### Mocking OAuth Authorization Flows

For testing OAuth flows that involve redirects and token exchanges:

```typescript
import { test, expect } from '@playwright/test';
import { OauthPlaygroundPage } from '../pages/oauth-playground-page';

test('authorization code flow with PKCE', async ({ page }) => {
  // Mock authorization endpoint to simulate redirect with code
  await page.route('**/authorize*', (route) => {
    const url = route.request().url();
    
    // Extract redirect_uri from the authorization request
    const params = new URLSearchParams(url.split('?')[1]);
    const redirectUri = params.get('redirect_uri');
    
    // Redirect back to the app with a code
    route.fulfill({
      status: 302,
      headers: {
        location: `${redirectUri}?code=test-auth-code&state=${params.get('state')}`
      }
    });
  });
  
  // Mock token endpoint
  await page.route('**/token', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token',
        id_token: mockTokens.standard,
        token_type: 'Bearer',
        expires_in: 3600
      })
    });
  });
  
  // Test implementation
  const oauthPage = new OauthPlaygroundPage(page);
  await oauthPage.navigate();
  await oauthPage.selectFlow('authorization-code-pkce');
  await oauthPage.enterAuthCodeDetails({
    clientId: 'test-client',
    authorizationUrl: 'https://example.com/authorize',
    tokenUrl: 'https://example.com/token',
    redirectUri: 'http://localhost:5173/oauth-playground/callback',
    scope: 'openid profile'
  });
  
  // Start the flow - this will trigger the redirect
  await oauthPage.startAuthorizationFlow();
  
  // After the mock redirect, we should be back at the callback page
  await expect(page).toHaveURL(/callback/);
  await expect(page.getByText('Authorization Code')).toContainText('test-auth-code');
  
  // Exchange code for token
  await oauthPage.exchangeCodeForToken();
  
  // Verify token received
  await expect(oauthPage.accessTokenValue).toContainText('mock-access-token');
});
```

### Mocking the Full OAuth Flow Suite

Create a comprehensive mock helper for OAuth testing:

```typescript
// playwright/utils/oauth-mocks.ts
import { Page } from '@playwright/test';
import { mockTokens } from './jwt-helpers';

export async function setupOAuthMocks(page: Page, options = {}) {
  const defaults = {
    authSuccess: true,
    includeIdToken: true,
    includeRefreshToken: true,
    tokenErrorCode: null,
    userInfoScope: 'openid profile email',
  };
  
  const config = { ...defaults, ...options };
  
  // Mock authorization endpoint
  await page.route('**/authorize*', (route) => {
    const url = route.request().url();
    const params = new URLSearchParams(url.split('?')[1]);
    const redirectUri = params.get('redirect_uri');
    const state = params.get('state');
    
    if (config.authSuccess) {
      route.fulfill({
        status: 302,
        headers: {
          location: `${redirectUri}?code=test-auth-code&state=${state}`
        }
      });
    } else {
      route.fulfill({
        status: 302,
        headers: {
          location: `${redirectUri}?error=access_denied&state=${state}`
        }
      });
    }
  });
  
  // Mock token endpoint
  await page.route('**/token', (route) => {
    if (config.tokenErrorCode) {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: config.tokenErrorCode,
          error_description: 'Error for testing purposes'
        })
      });
      return;
    }
    
    const response = {
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
    };
    
    if (config.includeIdToken) {
      response.id_token = mockTokens.standard;
    }
    
    if (config.includeRefreshToken) {
      response.refresh_token = 'mock-refresh-token';
    }
    
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
  
  // Mock userinfo endpoint
  await page.route('**/userinfo', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sub: '1234567890',
        name: 'John Doe',
        email: 'john.doe@example.com',
        picture: 'https://example.com/avatar.jpg'
      })
    });
  });
}
```

## Recording and Replaying Real API Responses

### Recording Real Responses

Create more realistic mocks by recording actual API responses:

```typescript
import fs from 'fs';
import path from 'path';

// Only run this test when you need to update recorded responses
test.skip('record real API responses', async ({ page }) => {
  // Bypass normal route mocking
  const responses = {};
  
  // Listen for responses to record
  page.on('response', async (response) => {
    const url = response.url();
    
    // Only record specific endpoints
    if (url.includes('.well-known/openid-configuration') || 
        url.includes('jwks.json')) {
      try {
        const body = await response.json();
        responses[url] = {
          status: response.status(),
          headers: response.headers(),
          body
        };
      } catch (e) {
        console.error('Failed to record response', e);
      }
    }
  });
  
  // Navigate and perform real requests
  await page.goto('/oidc-explorer');
  await page.fill('[data-testid="config-url-input"]', 
    'https://accounts.google.com/.well-known/openid-configuration');
  await page.click('button:has-text("Fetch")');
  
  // Wait for requests to complete
  await page.waitForTimeout(2000);
  
  // Save recorded responses
  const outputPath = path.join(__dirname, '../fixtures/recorded-responses.json');
  fs.writeFileSync(outputPath, JSON.stringify(responses, null, 2));
  
  console.log(`Saved recorded responses to ${outputPath}`);
});
```

### Using Recorded Responses

```typescript
import { test, expect } from '@playwright/test';
import recordedResponses from '../fixtures/recorded-responses.json';

test('uses recorded API responses', async ({ page }) => {
  // Set up route handlers using recorded data
  for (const [url, response] of Object.entries(recordedResponses)) {
    // Extract the path pattern from the URL
    const urlObj = new URL(url);
    const pathPattern = urlObj.pathname;
    
    // Create a route handler for this pattern
    await page.route(`**/api/cors-proxy/**${pathPattern}`, (route) => {
      route.fulfill({
        status: response.status,
        headers: response.headers,
        body: JSON.stringify(response.body)
      });
    });
  }
  
  // Run your test with realistic data
  // ...
});
```

## Advanced Mocking Techniques

### Request Verification

Verify that requests contain expected parameters:

```typescript
test('sends correct parameters to token endpoint', async ({ page }) => {
  // Track token request parameters
  let tokenRequest;
  
  await page.route('**/token', (route) => {
    tokenRequest = {
      method: route.request().method(),
      headers: route.request().headers(),
      postData: route.request().postDataJSON()
    };
    
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-token',
        token_type: 'Bearer',
        expires_in: 3600
      })
    });
  });
  
  // Execute test that makes a token request...
  
  // Verify request parameters
  expect(tokenRequest.method).toBe('POST');
  expect(tokenRequest.headers['content-type']).toContain('application/x-www-form-urlencoded');
  expect(tokenRequest.postData.grant_type).toBe('client_credentials');
  expect(tokenRequest.postData.client_id).toBe('test-client');
});
```

### Dynamic Response Generation

Generate dynamic responses based on request parameters:

```typescript
test('handles pagination in results', async ({ page }) => {
  // Track page number to return different results per page
  const resultsByPage = {
    1: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }],
    2: [{ id: 3, name: 'Item 3' }, { id: 4, name: 'Item 4' }],
    3: [{ id: 5, name: 'Item 5' }]
  };
  
  await page.route('**/api/items*', (route) => {
    const url = route.request().url();
    const params = new URLSearchParams(url.split('?')[1]);
    const page = parseInt(params.get('page') || '1');
    
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: resultsByPage[page] || [],
        pagination: {
          current_page: page,
          total_pages: 3,
          total_items: 5
        }
      })
    });
  });
  
  // Test pagination implementation
  // ...
});
```

### Modifying Real Responses

Sometimes it's useful to intercept real responses and modify them:

```typescript
test('handles specific OIDC features', async ({ page, context }) => {
  // Allow real request but modify the response
  await page.route('**/api/cors-proxy/**/.well-known/openid-configuration', async (route) => {
    // Perform the real request
    const response = await context.request.fetch(route.request());
    
    // Get the original response body
    const originalBody = await response.json();
    
    // Modify specific fields
    const modifiedBody = {
      ...originalBody,
      // Add a field that might not be in all providers
      backchannel_logout_supported: true,
      // Remove a field to test fallbacks
      delete originalBody.token_endpoint_auth_methods_supported
    };
    
    // Fulfill with modified response
    route.fulfill({
      status: response.status(),
      headers: response.headers(),
      body: JSON.stringify(modifiedBody)
    });
  });
  
  // Test implementation...
});
```

## Best Practices

### Organizing Mocks

1. **Create mock utilities** for commonly used endpoints:
   - OIDC configurations
   - JWKS endpoints
   - Token endpoints
   - UserInfo endpoints

2. **Organize mock data by feature**:
   - Token Inspector mocks
   - OIDC Explorer mocks
   - OAuth Playground mocks

3. **Use realistic data** that mimics production:
   - Copy real response structures
   - Include all required fields
   - Model real provider behavior

### Stability and Maintainability

1. **Version your mock data** alongside tests:
   - Store mock data in fixture files
   - Update mocks when APIs change
   - Comment mock data with sources/dates

2. **Handle request failures gracefully**:
   - Avoid tests hanging on unhandled routes
   - Set default route handlers for test stability

3. **Make mock helpers flexible**:
   - Allow overriding defaults
   - Support different test scenarios
   - Include documentation for complex mocks

### Performance Considerations

1. **Be specific with route matching**:
   - Use the most specific URL patterns possible
   - Avoid intercepting unnecessary requests

2. **Minimize mock complexity**:
   - Only mock what's needed for the test
   - Generate responses efficiently

3. **Reuse mock setup** across related tests:
   - Initialize common mocks in describe blocks
   - Use test fixtures for shared mocking setup

## Conclusion

Effective API mocking is essential for reliable, fast, and comprehensive testing of IAM Tools. By using these techniques, you can create tests that accurately verify how your application works with external identity providers and services, without depending on their availability or consistency.

Remember to keep your mocks as close to real responses as possible while ensuring tests remain reliable and deterministic.