# Implementing New Playwright Tests

This guide provides detailed instructions for creating new end-to-end tests using Playwright in IAM Tools. Follow these patterns to ensure your tests are maintainable, reliable, and consistent with the project's testing strategy.

## Table of Contents

- [When to Add New Tests](#when-to-add-new-tests)
- [Creating a Basic Test](#creating-a-basic-test)
- [Adding Page Objects](#adding-page-objects)
- [Creating Test Fixtures](#creating-test-fixtures)
- [Mocking API Responses](#mocking-api-responses)
- [Visual Testing](#visual-testing)
- [Advanced Patterns](#advanced-patterns)
- [Examples by Feature](#examples-by-feature)

## When to Add New Tests

Add new Playwright tests in these scenarios:

1. **New Features**: When adding a new feature or component
2. **Bug Fixes**: When fixing a bug (to prevent regression)
3. **Refactoring**: When making significant changes to existing functionality
4. **Critical Paths**: When identifying untested user flows that are critical for the application

## Creating a Basic Test

### 1. Create a new test file

Place your test file in the appropriate location in the `playwright/tests/` directory. Use the naming convention `feature-name.spec.ts`:

```typescript
// playwright/tests/oidc-explorer.spec.ts
import { test, expect } from '@playwright/test';
import { Navigation } from '../utils/navigation';

test.describe('OIDC Explorer', () => {
  test('loads configuration from valid URL', async ({ page }) => {
    // Navigate to the OIDC Explorer page
    const nav = new Navigation(page);
    await nav.goToOidcExplorer();
    
    // Enter a valid configuration URL
    await page.getByTestId('config-url-input').fill('https://accounts.google.com/.well-known/openid-configuration');
    await page.getByRole('button', { name: 'Fetch' }).click();
    
    // Assert that the configuration is displayed
    await expect(page.getByTestId('issuer-value')).toBeVisible();
    await expect(page.getByTestId('issuer-value')).toContainText('google.com');
  });
});
```

### 2. Follow the AAA Pattern

Structure your tests using the Arrange-Act-Assert pattern:

```typescript
test('validates token signature with JWKS', async ({ page }) => {
  // Arrange: Set up the test environment
  const tokenPage = new TokenInspectorPage(page);
  await tokenPage.navigate();
  
  // Act: Perform the user action
  await tokenPage.enterToken(validToken);
  await tokenPage.clickVerifySignature();
  
  // Assert: Verify the expected outcome
  await expect(tokenPage.verificationStatus).toContainText('Valid Signature');
});
```

### 3. Use Descriptive Test Names

Name your tests to clearly describe the behavior being tested:

```typescript
test('displays error message when OIDC configuration URL is invalid', async ({ page }) => {
  // Test implementation
});

test('shows token expiration status as "expired" for tokens with past exp claim', async ({ page }) => {
  // Test implementation
});
```

## Adding Page Objects

Page Object Models (POMs) encapsulate page structure and behavior, making tests more maintainable.

### 1. Create a New Page Object

```typescript
// playwright/pages/oidc-explorer-page.ts
import { Page, Locator } from '@playwright/test';

export class OidcExplorerPage {
  readonly page: Page;
  readonly configUrlInput: Locator;
  readonly fetchButton: Locator;
  readonly configDisplay: Locator;
  readonly issuerValue: Locator;
  readonly errorMessage: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.configUrlInput = page.getByTestId('config-url-input');
    this.fetchButton = page.getByRole('button', { name: 'Fetch' });
    this.configDisplay = page.getByTestId('config-display');
    this.issuerValue = page.getByTestId('issuer-value');
    this.errorMessage = page.getByTestId('error-message');
  }
  
  async navigate() {
    await this.page.goto('/oidc-explorer');
  }
  
  async fetchConfiguration(url: string) {
    await this.configUrlInput.fill(url);
    await this.fetchButton.click();
  }
  
  async getEndpointValue(endpoint: string) {
    return this.page.getByTestId(`endpoint-${endpoint}`);
  }
}
```

### 2. Use the Page Object in Tests

```typescript
// playwright/tests/oidc-explorer.spec.ts
import { test, expect } from '@playwright/test';
import { OidcExplorerPage } from '../pages/oidc-explorer-page';

test.describe('OIDC Explorer', () => {
  test('loads and displays configuration endpoints', async ({ page }) => {
    const oidcPage = new OidcExplorerPage(page);
    await oidcPage.navigate();
    await oidcPage.fetchConfiguration('https://accounts.google.com/.well-known/openid-configuration');
    
    await expect(oidcPage.issuerValue).toBeVisible();
    await expect(oidcPage.getEndpointValue('authorization_endpoint')).toBeVisible();
    await expect(oidcPage.getEndpointValue('token_endpoint')).toBeVisible();
  });
});
```

### 3. Component Selectors

For reusable components that appear across multiple pages, create component selectors:

```typescript
// playwright/utils/component-selectors.ts
export class TokenInput {
  readonly page: Page;
  readonly inputField: Locator;
  readonly clearButton: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.inputField = page.getByTestId('token-input-field');
    this.clearButton = page.getByTestId('token-input-clear');
  }
  
  async enterToken(token: string) {
    await this.inputField.fill(token);
  }
  
  async clear() {
    await this.clearButton.click();
  }
}
```

## Creating Test Fixtures

Fixtures help set up test environments and share common data or utilities.

### 1. Basic Fixture for Test Data

```typescript
// playwright/fixtures/tokens.ts
export const testTokens = {
  valid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4yswhUVvF3p7lSQyGKUM88HmYxYFNxgpgI4BFoMGEhE',
  malformed: 'not-a-valid-token'
};
```

### 2. Custom Test Fixtures

Extend the base Playwright test fixture:

```typescript
// playwright/fixtures/auth.ts
import { test as baseTest } from '@playwright/test';
import { OauthPlaygroundPage } from '../pages/oauth-playground-page';

// Extend the base test with our custom fixtures
export const test = baseTest.extend({
  // A page with a completed OAuth flow
  authenticatedPage: async ({ page }, use) => {
    const oauthPage = new OauthPlaygroundPage(page);
    await oauthPage.navigate();
    await oauthPage.selectFlow('client-credentials');
    await oauthPage.enterClientDetails({
      clientId: 'test-client',
      clientSecret: 'test-secret',
      tokenUrl: 'https://example.com/token'
    });
    await oauthPage.requestToken();
    
    // Wait for token acquisition to complete
    await page.waitForSelector('[data-testid="access-token-value"]');
    
    // Provide the fixture value to the test
    await use(page);
  }
});
```

### 3. Using Fixtures in Tests

```typescript
// playwright/tests/oauth-playground.spec.ts
import { test } from '../fixtures/auth';
import { expect } from '@playwright/test';

test('displays token introspection results', async ({ authenticatedPage: page }) => {
  // Test already has a page with authentication completed
  await page.getByRole('link', { name: 'Introspection' }).click();
  await page.getByRole('button', { name: 'Introspect Token' }).click();
  
  await expect(page.getByTestId('introspection-active')).toContainText('true');
});
```

## Mocking API Responses

Mock external services and APIs to create predictable test environments.

### 1. Route Interception

```typescript
// Basic response mocking
test('handles JWKS fetch error gracefully', async ({ page }) => {
  // Mock the JWKS endpoint to return an error
  await page.route('**/api/cors-proxy/**/.well-known/jwks.json', (route) => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' })
    });
  });
  
  const tokenPage = new TokenInspectorPage(page);
  await tokenPage.navigate();
  await tokenPage.enterToken(testTokens.valid);
  await tokenPage.enterJwksUrl('https://example.com/.well-known/jwks.json');
  await tokenPage.clickVerifySignature();
  
  await expect(tokenPage.verificationError).toContainText('Failed to fetch JWKS');
});
```

### 2. Request Inspection

```typescript
// Verify request parameters
test('sends correct parameters in token request', async ({ page }) => {
  let requestBody;
  
  // Capture the request body
  await page.route('**/token', (route) => {
    requestBody = route.request().postDataJSON();
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
  
  const oauthPage = new OauthPlaygroundPage(page);
  await oauthPage.navigate();
  await oauthPage.selectFlow('client-credentials');
  await oauthPage.enterClientDetails({
    clientId: 'test-client', 
    clientSecret: 'test-secret',
    tokenUrl: 'https://example.com/token'
  });
  await oauthPage.requestToken();
  
  // Verify the request contained the correct params
  expect(requestBody).toEqual({
    grant_type: 'client_credentials',
    client_id: 'test-client',
    client_secret: 'test-secret'
  });
});
```

### 3. Mock API Utilities

Create helper functions for common mocking patterns:

```typescript
// playwright/utils/api-mocks.ts
import { Page } from '@playwright/test';

export async function mockOidcConfiguration(page: Page, issuerUrl: string, config = {}) {
  const defaultConfig = {
    issuer: issuerUrl,
    authorization_endpoint: `${issuerUrl}/authorize`,
    token_endpoint: `${issuerUrl}/token`,
    userinfo_endpoint: `${issuerUrl}/userinfo`,
    jwks_uri: `${issuerUrl}/.well-known/jwks.json`,
    // ...other defaults
  };
  
  const mockConfig = { ...defaultConfig, ...config };
  
  await page.route(`**/api/cors-proxy/**/.well-known/openid-configuration`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockConfig)
    });
  });
  
  return mockConfig;
}
```

## Visual Testing

Use Playwright's screenshot capabilities for visual regression testing.

### 1. Basic Screenshot Comparison

```typescript
test('theme applies correctly to token display', async ({ page }) => {
  const tokenPage = new TokenInspectorPage(page);
  await tokenPage.navigate();
  await tokenPage.enterToken(testTokens.valid);
  
  // Capture the token display in light mode
  await expect(tokenPage.tokenDisplay).toHaveScreenshot('token-display-light.png');
  
  // Switch to dark mode
  await tokenPage.toggleTheme();
  
  // Capture the token display in dark mode
  await expect(tokenPage.tokenDisplay).toHaveScreenshot('token-display-dark.png');
});
```

### 2. Screenshot with Masking

```typescript
test('UI layout remains consistent with different tokens', async ({ page }) => {
  const tokenPage = new TokenInspectorPage(page);
  await tokenPage.navigate();
  await tokenPage.enterToken(testTokens.valid);
  
  // Mask dynamic content for stable comparisons
  await expect(page).toHaveScreenshot('token-inspector.png', {
    mask: [
      // Mask areas with dynamic content to avoid flaky tests
      page.getByTestId('token-value'),
      page.getByTestId('token-expiry-time')
    ]
  });
});
```

### 3. Mobile Viewport Testing

```typescript
// In a project configuration that uses mobile viewports
test('responsive layout adapts to mobile screen', async ({ page }) => {
  const tokenPage = new TokenInspectorPage(page);
  await tokenPage.navigate();
  
  // Take screenshot of the responsive layout
  await expect(page).toHaveScreenshot('token-inspector-mobile.png');
});
```

## Advanced Patterns

### 1. Multi-step Workflows

For complex user journeys that span multiple pages:

```typescript
test('complete OAuth flow with authorization code and PKCE', async ({ page }) => {
  // Set up mocks for the authorization server
  await mockAuthorizationEndpoint(page);
  await mockTokenEndpoint(page);
  
  const oauthPage = new OauthPlaygroundPage(page);
  await oauthPage.navigate();
  
  // Step 1: Configure the OAuth client
  await oauthPage.selectFlow('authorization-code-pkce');
  await oauthPage.enterAuthCodeDetails({
    clientId: 'test-client',
    authorizationUrl: 'https://example.com/authorize',
    tokenUrl: 'https://example.com/token',
    redirectUri: 'http://localhost:5173/oauth-playground/callback',
    scope: 'openid profile'
  });
  
  // Step 2: Initiate authorization request
  await oauthPage.startAuthorizationFlow();
  
  // Step 3: Handle the mock authorization callback
  await page.waitForURL(/callback/);
  
  // Step 4: Exchange code for token
  await oauthPage.exchangeCodeForToken();
  
  // Verify the full flow completed successfully
  await expect(oauthPage.accessTokenValue).toBeVisible();
  await expect(oauthPage.idTokenValue).toBeVisible();
});
```

### 2. Parameterized Tests

Run the same test with different inputs:

```typescript
for (const provider of ['google', 'auth0', 'okta']) {
  test(`identifies ${provider} as a known provider`, async ({ page }) => {
    const configUrl = `https://${provider}-example.com/.well-known/openid-configuration`;
    await mockOidcConfiguration(page, configUrl, { issuer: `https://${provider}-example.com` });
    
    const oidcPage = new OidcExplorerPage(page);
    await oidcPage.navigate();
    await oidcPage.fetchConfiguration(configUrl);
    
    await expect(oidcPage.providerLogo).toBeVisible();
    await expect(oidcPage.providerName).toContainText(provider, { ignoreCase: true });
  });
}
```

### 3. Test Hooks for Setup and Teardown

```typescript
test.describe('OAuth Playground Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Set up common mocks before each test
    await mockTokenEndpoint(page);
  });
  
  test.afterEach(async ({ page }) => {
    // Clean up localStorage after tests
    await page.evaluate(() => localStorage.clear());
  });
  
  test('client credentials flow caches tokens', async ({ page }) => {
    // Test implementation
  });
});
```

## Examples by Feature

### Token Inspector Example

```typescript
// playwright/tests/token-inspector.spec.ts
import { test, expect } from '@playwright/test';
import { TokenInspectorPage } from '../pages/token-inspector-page';
import { testTokens } from '../fixtures/tokens';

test.describe('Token Inspector Feature', () => {
  test('displays token parts when valid JWT is entered', async ({ page }) => {
    const tokenPage = new TokenInspectorPage(page);
    await tokenPage.navigate();
    await tokenPage.enterToken(testTokens.valid);
    
    await expect(tokenPage.headerSection).toBeVisible();
    await expect(tokenPage.headerAlgorithm).toContainText('HS256');
    
    await expect(tokenPage.payloadSection).toBeVisible();
    await expect(tokenPage.getClaimValue('sub')).toContainText('1234567890');
    await expect(tokenPage.getClaimValue('name')).toContainText('John Doe');
  });
  
  test('shows expired status for tokens with past exp claim', async ({ page }) => {
    const tokenPage = new TokenInspectorPage(page);
    await tokenPage.navigate();
    await tokenPage.enterToken(testTokens.expired);
    
    await expect(tokenPage.expirationStatus).toContainText('Expired');
    await expect(tokenPage.timelineExpired).toBeVisible();
  });
  
  test('shows error for malformed tokens', async ({ page }) => {
    const tokenPage = new TokenInspectorPage(page);
    await tokenPage.navigate();
    await tokenPage.enterToken(testTokens.malformed);
    
    await expect(tokenPage.parsingError).toBeVisible();
    await expect(tokenPage.parsingError).toContainText('Invalid token format');
  });
});
```

### OIDC Explorer Example

```typescript
// playwright/tests/oidc-explorer.spec.ts
import { test, expect } from '@playwright/test';
import { OidcExplorerPage } from '../pages/oidc-explorer-page';
import { mockOidcConfiguration } from '../utils/api-mocks';

test.describe('OIDC Explorer Feature', () => {
  test('displays configuration when valid URL is entered', async ({ page }) => {
    // Mock the OIDC configuration endpoint
    const mockConfig = await mockOidcConfiguration(page, 'https://example.com');
    
    const oidcPage = new OidcExplorerPage(page);
    await oidcPage.navigate();
    await oidcPage.fetchConfiguration('https://example.com/.well-known/openid-configuration');
    
    await expect(oidcPage.issuerValue).toContainText(mockConfig.issuer);
    await expect(oidcPage.getEndpointValue('authorization_endpoint')).toContainText(mockConfig.authorization_endpoint);
    await expect(oidcPage.getEndpointValue('token_endpoint')).toContainText(mockConfig.token_endpoint);
  });
  
  test('fetches and displays JWKS information', async ({ page }) => {
    // Mock both OIDC config and JWKS endpoints
    const mockConfig = await mockOidcConfiguration(page, 'https://example.com');
    
    // Mock the JWKS endpoint
    await page.route(`**/api/cors-proxy/**/.well-known/jwks.json`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          keys: [
            {
              kty: 'RSA',
              use: 'sig',
              kid: 'test-key-id',
              n: 'sample-modulus',
              e: 'AQAB'
            }
          ]
        })
      });
    });
    
    const oidcPage = new OidcExplorerPage(page);
    await oidcPage.navigate();
    await oidcPage.fetchConfiguration('https://example.com/.well-known/openid-configuration');
    await oidcPage.clickFetchJwks();
    
    await expect(oidcPage.jwksDisplay).toBeVisible();
    await expect(oidcPage.getKeyProperty('kid')).toContainText('test-key-id');
    await expect(oidcPage.getKeyProperty('kty')).toContainText('RSA');
  });
});
```

### OAuth Playground Example

```typescript
// playwright/tests/oauth-playground.spec.ts
import { test, expect } from '@playwright/test';
import { OauthPlaygroundPage } from '../pages/oauth-playground-page';

test.describe('OAuth Playground Feature', () => {
  test('client credentials flow fetches token', async ({ page }) => {
    // Mock the token endpoint
    await page.route('**/token', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      });
    });
    
    const oauthPage = new OauthPlaygroundPage(page);
    await oauthPage.navigate();
    await oauthPage.selectFlow('client-credentials');
    await oauthPage.enterClientDetails({
      clientId: 'test-client',
      clientSecret: 'test-secret',
      tokenUrl: 'https://example.com/token'
    });
    await oauthPage.requestToken();
    
    await expect(oauthPage.accessTokenValue).toContainText('mock-access-token');
    await expect(oauthPage.tokenExpiryValue).toContainText('3600');
  });
});
```