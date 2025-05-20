# Playwright End-to-End Testing Guide for IAM Tools

This documentation provides a comprehensive guide for working with the Playwright end-to-end (E2E) testing suite in IAM Tools. Playwright enables reliable, cross-browser automated testing that simulates real user interactions.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Writing Tests](#writing-tests)
- [Test Organization](#test-organization)
- [Core Testing Patterns](#core-testing-patterns)
- [Page Objects and Component Selectors](#page-objects-and-component-selectors)
- [Fixtures and Test Data](#fixtures-and-test-data)
- [Mocking and Network Interception](#mocking-and-network-interception)
- [Visual Testing](#visual-testing)
- [Debugging](#debugging)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

The IAM Tools E2E testing strategy focuses on validating critical user journeys across all main features:

- **Token Inspector**: Validate token parsing, display, and signature verification
- **OIDC Explorer**: Test configuration fetching, display, and provider identification
- **OAuth Playground**: Verify OAuth flows, token exchanges, and API interactions

By using Playwright, we can:

- Run tests across multiple browsers (Chromium, Firefox, WebKit)
- Test on both desktop and mobile viewports
- Simulate real user interactions
- Capture detailed failure information (screenshots, videos, traces)
- Integrate with our CI/CD pipeline

## Getting Started

### Prerequisites

- Node.js v18+ and Bun v1.0+
- IAM Tools repository cloned locally

### Installation

```bash
# Install dependencies (if not already done)
bun install

# Install browser engines
bun run test:e2e:install
# Or directly:
npx playwright install chromium firefox webkit
```

## Running Tests

The project includes several scripts for running Playwright tests:

```bash
# Run all E2E tests
bun run test:e2e

# Run tests with the Playwright UI
bun run test:e2e:ui

# Run tests in debug mode (with Playwright Inspector)
bun run test:e2e:debug

# View the HTML test report from previous runs
bun run test:e2e:report

# Run tests only in a specific browser
bun run test:e2e:chromium
bun run test:e2e:firefox
bun run test:e2e:webkit

# Generate tests using Playwright's codegen tool
bun run test:e2e:codegen
```

## Project Structure

```
playwright/
├── tests/               # Test files organized by feature
│   ├── home.spec.ts
│   ├── token-inspector.spec.ts
│   ├── oidc-explorer.spec.ts
│   └── oauth-playground.spec.ts
├── utils/               # Shared utilities and helpers
│   ├── navigation.ts
│   ├── component-selectors.ts
│   └── test-helpers.ts
├── fixtures/            # Reusable test fixtures and data
│   ├── auth.ts
│   ├── tokens.ts
│   └── mock-data.ts
├── pages/               # Page object models
│   ├── home-page.ts
│   ├── token-inspector-page.ts
│   ├── oidc-explorer-page.ts
│   └── oauth-playground-page.ts
└── config/              # Environment-specific configurations
    └── ci.config.ts
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { TokenInspectorPage } from '../pages/token-inspector-page';

test.describe('Token Inspector Feature', () => {
  test('should parse a valid JWT token', async ({ page }) => {
    // Arrange: Set up the test environment
    const tokenPage = new TokenInspectorPage(page);
    await tokenPage.navigate();
    
    // Act: Perform the user action
    await tokenPage.enterToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
    
    // Assert: Verify the expected outcome
    await expect(tokenPage.headerSection).toBeVisible();
    await expect(tokenPage.payloadSection).toBeVisible();
    await expect(tokenPage.getClaimValue('sub')).toContainText('1234567890');
  });
});
```

### Test Organization

Group related tests using `test.describe` blocks and use clear, descriptive test names that explain the scenario and expected outcome:

```typescript
test.describe('Token Inspector', () => {
  test.describe('Token Parsing', () => {
    test('displays header and payload for valid tokens', async ({ page }) => {
      // Test implementation
    });
    
    test('shows error for invalid tokens', async ({ page }) => {
      // Test implementation
    });
  });
  
  test.describe('Token Verification', () => {
    // Verification-specific tests
  });
});
```

## Core Testing Patterns

### Page Objects and Component Selectors

The IAM Tools testing suite uses the Page Object Model (POM) pattern to create abstractions around pages and components. This improves test maintainability by centralizing selectors and page interactions.

**Example Page Object:**

```typescript
// pages/token-inspector-page.ts
import { Page, Locator } from '@playwright/test';

export class TokenInspectorPage {
  readonly page: Page;
  readonly tokenInput: Locator;
  readonly headerSection: Locator;
  readonly payloadSection: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.tokenInput = page.getByTestId('token-input');
    this.headerSection = page.getByTestId('token-header');
    this.payloadSection = page.getByTestId('token-payload');
  }
  
  async navigate() {
    await this.page.goto('/token-inspector');
  }
  
  async enterToken(token: string) {
    await this.tokenInput.fill(token);
  }
  
  getClaimValue(claimName: string) {
    return this.page.getByTestId(`claim-${claimName}`);
  }
}
```

### Fixtures and Test Data

Reuse test data and setup logic with Playwright fixtures:

```typescript
// fixtures/tokens.ts
import { test as base } from '@playwright/test';

export const testTokens = {
  valid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  malformed: 'not-a-token'
};

// Extend the base test with custom fixtures
export const test = base.extend({
  // A fixture that sets up a token in the inspector
  tokenInspectorWithToken: async ({ page }, use) => {
    await page.goto('/token-inspector');
    await page.getByTestId('token-input').fill(testTokens.valid);
    await use(page);
  }
});
```

### Mocking and Network Interception

Playwright allows intercepting and mocking network requests, which is useful for testing API interactions:

```typescript
test('displays JWKS from provider', async ({ page }) => {
  // Mock the JWKS endpoint
  await page.route('**/api/cors-proxy/**/.well-known/jwks.json', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        keys: [
          {
            kty: 'RSA',
            use: 'sig',
            kid: 'test-key-id',
            // ... other key properties
          }
        ]
      })
    });
  });
  
  // Continue with the test...
});
```

### Visual Testing

Playwright supports visual testing through screenshots:

```typescript
test('theme toggle changes appearance', async ({ page }) => {
  await page.goto('/');
  
  // Take a screenshot in light mode
  await expect(page).toHaveScreenshot('home-light-mode.png');
  
  // Toggle theme
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  
  // Take a screenshot in dark mode
  await expect(page).toHaveScreenshot('home-dark-mode.png');
});
```

## Debugging

### Debugging Failed Tests

1. **Check the HTML report** with `bun run test:e2e:report`
2. **Review screenshots and videos** in the `e2e/test-results` directory
3. **Use Playwright Trace Viewer** to replay the test step by step

### Interactive Debugging

1. Run tests in debug mode: `bun run test:e2e:debug`
2. Add `await page.pause()` at strategic points in your test
3. Use the Playwright Inspector UI to:
   - Step through test execution
   - Inspect the DOM
   - Try out selectors

### Troubleshooting Common Issues

- **Selector not found**: Check if the element is in the DOM and visible
- **Timing issues**: Use `await expect(locator).toBeVisible()` before interactions
- **Network problems**: Verify request/response patterns with network logging

## CI/CD Integration

IAM Tools uses a custom CI configuration for Playwright:

```typescript
// CI-specific configuration in playwright/config/ci.config.ts
export default defineConfig({
  ...baseConfig,
  workers: 1,        // Run tests serially
  retries: 2,        // Retry failed tests
  reporter: ['html', 'github'],  // Report formats
  
  // For CI, we only run on chromium to save time
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

## Best Practices

### Selector Strategy

1. **Prefer data attributes**:
   ```html
   <input data-testid="token-input" />
   ```
   ```typescript
   page.getByTestId('token-input')
   ```

2. **Use semantic selectors** when appropriate:
   ```typescript
   page.getByRole('button', { name: 'Sign In' })
   page.getByLabel('Password')
   ```

3. **Avoid brittle selectors** like CSS classes or XPath

### Test Independence

1. Each test should be independent and not rely on other tests
2. Use `beforeEach` for setup rather than sharing state between tests
3. Clean up any persistent state in `afterEach` hooks

### Performance

1. Use the minimum number of assertions needed to validate behavior
2. Group related tests to minimize redundant setup
3. Be mindful of test execution time

### Maintenance

1. Keep page objects and selectors up to date with UI changes
2. Regularly review and update tests as features evolve
3. Document complex test scenarios