# E2E Tests

This directory contains end-to-end tests for IAM Tools using Playwright.

## Setup

1. Install dependencies:

```bash
bun install
```

1. Install Playwright browsers:

```bash
bun run e2e:install
```

## Running Tests

Run all tests (uses list reporter by default to prevent terminal blocking):

```bash
bun run e2e
```

Run tests on all browsers:

```bash
bun run e2e:all
```

Run tests in UI mode (interactive):

```bash
bun run e2e:ui
```

Run tests with browser visible:

```bash
bun run e2e:headed
```

Debug tests:

```bash
bun run e2e:debug
```

Run with a specific reporter:

```bash
bun run e2e --reporter=html  # Generate HTML report
bun run e2e --reporter=dot   # Minimal output
```

## Test Structure

```text
e2e/
├── playwright.config.ts      # Playwright configuration
├── helpers/                  # Test utilities and helpers
│   ├── selectors.ts         # Common selectors used across tests
│   └── test-utils.ts        # Utility functions for tests
└── tests/                   # Test files
    ├── navigation.spec.ts   # Navigation and homepage tests
    ├── token-inspector.spec.ts
    ├── oidc-explorer.spec.ts
    ├── oauth-playground-auth-code.spec.ts
    └── oauth-playground-client-credentials.spec.ts
```

## Key Selectors

The application uses specific patterns for element selection:

- **Primary buttons**: `.bg-primary` (e.g., "Fetch Config", "Inspect Token")
- **Secondary buttons**: `.bg-secondary`
- **Input fields**: `input[placeholder="..."]` or by name attribute
- **Navigation links**: `a[href="/route-path"]`
- **Tabs**: `button[role="tab"]`

For dynamic text-based selection:

```javascript
// Select button by text
page.locator('button:has-text("Button Text")')

// Or using JavaScript
Array.from(document.querySelectorAll('button')).find((el) => el.textContent.includes('Button Text'))
```

## Writing Tests

1. Use the `TestUtils` class for common operations:

```typescript
const utils = new TestUtils(page)
await utils.navigateTo('/token-inspector')
await utils.clickAndWait('#submit', '.results')
```

1. Use the centralized selectors:

```typescript
import { selectors } from '../helpers/selectors'
await page.click(selectors.buttons.primary)
```

1. Follow the test pattern:

- Setup with `beforeEach`
- Test specific functionality
- Clean up if needed

## Tips

- The app uses shadcn/ui components with Tailwind CSS
- Wait for elements to be visible before interacting
- Use `networkidle` for pages that load external data
- Add screenshots for debugging: `await page.screenshot({ path: 'debug.png' })`
- Tests run against `http://localhost:5173` by default

## Debugging Failed Tests

1. Run with `--debug` flag to step through tests
2. Check the HTML report after running tests
3. Use `page.pause()` to pause execution
4. Enable trace recording in playwright.config.ts

## Common Test Patterns

Based on recent fixes, here are patterns that work well:

### Selecting Elements

```typescript
// Use placeholder text for inputs
await page.fill('input[placeholder*="client"]', 'test-client')

// Use button text for actions
const button = await utils.getButtonByText('Continue to Authorization')
await button.click()

// Handle multiple matches with .first()
await expect(page.locator('text=iss').first()).toBeVisible()
```

### Waiting for UI Updates

```typescript
// Wait for specific elements instead of toasts
await page.waitForSelector('text=Result', { timeout: 5000 })

// Small delay for UI state changes
await page.waitForTimeout(500)

// Wait for network idle after navigation
await page.waitForLoadState('networkidle')
```

### Demo Mode Testing

```typescript
// Enable demo mode
await page.click('#demo-mode-switch')
await page.waitForTimeout(500)

// Client ID is required even in demo mode
await page.fill('input[placeholder*="client"]', 'test-client')
```

### Tab Navigation

```typescript
// Click on tab and verify content changes
await page.click('button[role="tab"]:has-text("Claims")')
await page.waitForTimeout(300)

// Verify tab is selected
const claimsTab = page.locator('[role="tab"]:has-text("Claims")')
await expect(claimsTab).toHaveAttribute('aria-selected', 'true')
```
