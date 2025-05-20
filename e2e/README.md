# End-to-End Tests with Playwright

This directory contains end-to-end tests for IAM Tools written using [Playwright](https://playwright.dev/).

## Structure

```
e2e/
├── page-objects/         # Page Object Models
├── tests/                # Test specifications
├── utils/                # Test utilities and helpers
└── test-results/         # Test results and artifacts (generated)
```

## Running Tests

IAM Tools uses Playwright for end-to-end testing. All test commands can be run using Bun:

```bash
# Run all tests in headless mode
bun run test:e2e

# Run tests with UI mode (interactive test explorer)
bun run test:e2e:ui

# Run tests in debug mode (opens browser inspector)
bun run test:e2e:debug

# View HTML test report
bun run test:e2e:report
```

## Writing Tests

### Page Object Pattern

We use the Page Object Model (POM) pattern to encapsulate UI interactions and keep tests clean. Each feature has its own page object class in the `page-objects` directory.

Example usage:

```typescript
import { test } from '../utils/test-utils';

test('should validate a token', async ({ tokenInspectorPage }) => {
  await tokenInspectorPage.goto();
  await tokenInspectorPage.enterToken('your.jwt.token');
  await tokenInspectorPage.verifyHeaderVisible();
});
```

### Test Data

Sample test data like JWT tokens are available in `utils/test-utils.ts`.

### Adding New Tests

1. If testing a new feature, create a page object in `page-objects/`
2. Add the page object to the test fixtures in `utils/test-utils.ts`
3. Create a test file in `tests/` with descriptive test cases

### Best Practices

1. Use page objects for UI interactions
2. Keep tests independent and idempotent
3. Use descriptive test names that explain the behavior being tested
4. Minimize the use of timeouts and prefer waiting for specific UI elements
5. Add appropriate assertions to verify the expected behavior

## Continuous Integration

Tests are automatically run in CI using GitHub Actions. The workflow configuration can be found in the `.github/workflows` directory.

## Troubleshooting

If tests are failing, you can:

1. Run in debug mode: `bun run test:e2e:debug`
2. Check the test report: `bun run test:e2e:report`
3. Look for screenshots and videos in the `e2e/test-results` directory