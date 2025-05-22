# E2E Tests

This directory contains end-to-end tests for IAM Tools using Playwright.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Install Playwright browsers:
```bash
bun run e2e:install
```

## Running Tests

Run all tests:
```bash
bun run e2e
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

## Test Structure

```
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
Array.from(document.querySelectorAll('button'))
  .find(el => el.textContent.includes('Button Text'))
```

## Writing Tests

1. Use the `TestUtils` class for common operations:
```typescript
const utils = new TestUtils(page);
await utils.navigateTo('/token-inspector');
await utils.clickAndWait('#submit', '.results');
```

2. Use the centralized selectors:
```typescript
import { selectors } from '../helpers/selectors';
await page.click(selectors.buttons.primary);
```

3. Follow the test pattern:
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