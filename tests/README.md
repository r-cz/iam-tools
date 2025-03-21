# IAM Tools End-to-End Tests

This directory contains end-to-end tests for the IAM Tools project using Playwright.

## Setup

To set up Playwright and its dependencies, run:

```bash
# From the project root
bunx playwright@latest install --with-deps
```

Or use the provided setup script:

```bash
# Make script executable
chmod +x tests/setup-playwright.sh
# Run the script
./tests/setup-playwright.sh
```

## Running Tests

You can run the tests using the following npm scripts:

- `bun test` - Run all tests
- `bun test:ui` - Run tests with UI mode for easier debugging
- `bun test:headed` - Run tests in headed mode (showing browser)
- `bun test:debug` - Run tests in debug mode

## Test Structure

- `e2e/` - End-to-end tests for main user flows
  - `home.spec.ts` - Tests for the home page
  - `tokenInspector.spec.ts` - Tests for the Token Inspector feature
  - `navigation.spec.ts` - Tests for navigation between features
- `components/` - Component-specific tests
  - `theme-toggle.spec.ts` - Tests for theme toggling functionality
- `utils/` - Test utilities and helpers
- `fixtures/` - Test fixtures

## Writing New Tests

When adding new tests:

1. Decide if it's an end-to-end test or a component test
2. Create a new file in the appropriate directory
3. Use existing tests as a template
4. Make sure to test all critical user paths

## CI/CD Integration

The tests are automatically run in the CI/CD pipeline on GitHub Actions when:
- Pushing to the main branch
- Creating a pull request

The test results are available as artifacts in the GitHub Actions workflow.
