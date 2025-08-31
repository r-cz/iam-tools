# IAM Tools Tests

This directory contains tests for the IAM Tools project using Bun's built-in test runner.

## Running Tests

You can run the tests using the following commands:

```bash
# Run all tests
bun test

# Run tests matching a specific pattern
bun test components
bun test lib

# Run with watch mode
bun test --watch

# Update snapshots if needed
bun test --update-snapshots

# Run with coverage
bun test:coverage
```

## Test Structure

- `components/` - Tests for React components
- `features/` - Tests for feature modules
  - `token-inspector.test.tsx` - Tests for token parsing logic
  - `token-inspector-integration.test.tsx` - Tests for Token Inspector core functionality
  - `oidc-explorer-integration.test.tsx` - Tests for OIDC Explorer core functionality
  - `oauth-playground-integration.test.tsx` - Tests for OAuth Playground core utilities
- `hooks/` - Tests for custom React hooks
- `lib/` - Tests for utility libraries
- `utils/` - Test utilities and helpers
  - `test-utils.ts` - Common test utilities
  - `test-api-mocks.ts` - API mocking utilities for tests

## Testing Approach

We use a multi-layered testing approach:

1. **Unit Tests**: Testing individual functions and utilities in isolation
2. **API Tests**: Testing data fetching and processing functionality
3. **Functional Tests**: Testing business logic without UI dependencies
4. **Utility Mocks**: Mocking API responses and browser functionality

## API Mocking

API calls are mocked using the `test-api-mocks.ts` utility, which provides:

- Mock API responses for OpenID configurations
- Mock JWKS data for key validation testing
- Intercepts `fetch` requests during testing

Example usage:

```typescript
import { setupApiMocks, sampleOidcConfigResponse } from '../utils/test-api-mocks'

describe('My Test Suite', () => {
  const apiMocks = setupApiMocks()

  beforeEach(() => {
    apiMocks.reset() // Reset mocks between tests
  })

  test('should handle API response', () => {
    // Set up mock response for specific URL
    apiMocks.mockSuccess('https://example.com/api', { result: 'success' })

    // Test logic that uses fetch...
  })
})
```

## Future Improvements

We're working on improving our testing infrastructure:

1. **DOM Testing**: Setting up proper DOM testing for React components
2. **Integration Tests**: Adding more comprehensive UI interaction tests
3. **Test Coverage**: Increasing overall test coverage
4. **Visual Testing**: Adding visual regression tests

## Writing Tests

When adding new tests:

1. Create a file with `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` extension
2. Import test utilities from `bun:test` or from our test utilities
3. Write tests using the standard Jest-like API

Example:

```typescript
import { describe, expect, test } from 'bun:test'
import { someFunction } from '../path-to-function'

describe('someFunction', () => {
  test('should return expected result', () => {
    const result = someFunction()
    expect(result).toBe(expectedValue)
  })
})
```
