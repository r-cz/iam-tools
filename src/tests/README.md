# IAM Tools Tests

This directory contains tests for the IAM Tools project using Bun's built-in test runner.

## Running Tests

You can run the tests using the following commands:

```bash
# Run all tests
bun test

# Run tests matching a specific pattern
bun test components

# Run with watch mode
bun test --watch

# Update snapshots if needed
bun test --update-snapshots
```

## Test Structure

- `components/` - Tests for React components
- `features/` - Tests for feature modules
- `hooks/` - Tests for custom React hooks
- `utils/` - Test utilities and helpers

## Writing Tests

When adding new tests:

1. Create a file with `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` extension
2. Import test utilities from `bun:test` or from our test utilities
3. Write tests using the standard Jest-like API

Example:

```typescript
import { describe, expect, test } from 'bun:test';
import { someFunction } from '../path-to-function';

describe('someFunction', () => {
  test('should return expected result', () => {
    const result = someFunction();
    expect(result).toBe(expectedValue);
  });
});
```

## DOM Testing

For testing React components, we use React Testing Library which is compatible with Bun's test runner.

Example:

```typescript
import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/ui/button';

describe('Button', () => {
  test('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```
