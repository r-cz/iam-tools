# IAM Tools Testing Guide

This document outlines the testing strategy and best practices for the IAM Tools project.

## Overview

The IAM Tools project employs a comprehensive testing approach to ensure reliability and security of its identity and access management functionality. Testing is particularly important for this project because:

1. It handles security-critical operations (JWT validation, OAuth flows, etc.)
2. It integrates with external identity providers
3. It processes and displays sensitive user information

## Testing Structure

The project follows a testing pyramid approach with the following levels:

### Unit Tests

Unit tests focus on testing individual functions and components in isolation. They provide the fastest feedback and help catch issues early in the development process.

- **Location**: `src/tests/` directory with subdirectories matching the project structure
- **Coverage**: Should aim for >80% coverage of critical code paths

### Integration Tests

Integration tests verify that components work together correctly, particularly for critical flows like OAuth authorization.

- **Location**: `src/tests/features/*/integration/` directories
- **Focus**: End-to-end flows and component interactions

### Visual/UI Tests

Snapshot tests ensure UI components render consistently.

- **Location**: `src/tests/components/__snapshots__/`
- **Tools**: Uses React Testing Library and Bun's testing utilities

## Running Tests

```bash
# Run all tests
bun test

# Run tests with watch mode (for development)
bun test:watch

# Get test coverage
bun test:coverage

# Update snapshots
bun test:update

# Run specific tests (e.g., only OAuth flow tests)
bun test --pattern "oauth"
```

## Testing Utilities

The project provides several testing utilities to make writing tests easier:

### General Testing Utilities (`src/tests/utils/test-utils.ts`)

- `createFetchMock()`: For mocking fetch requests
- `createProxyFetchMock()`: For testing the proxy fetch functionality
- `createStorageMock()`: For testing localStorage/sessionStorage interactions
- `mockWindowLocation()`: For testing URL-based functionality
- `mockConsole()`: For testing logging functionality

### JWT Testing Utilities (`src/tests/utils/jwt-test-helpers.ts`)

- `generateTestKeyPair()`: Creates RSA key pairs for JWT testing
- `createTestJWT()`: Creates valid test JWTs
- `createInvalidJWT()`: Creates JWTs with invalid signatures
- `createExpiredJWT()`: Creates expired JWTs
- `createFutureJWT()`: Creates JWTs that are not yet valid
- `createTestJWKS()`: Creates test JWKS with multiple keys

## Critical Test Areas

### OAuth Flow Testing

OAuth flows are tested comprehensively in the integration tests:

1. **Auth Code with PKCE Flow**:
   - Testing the full flow from configuration to token exchange
   - Verifying state and code_verifier generation and validation
   - Testing error scenarios and edge cases
   - Testing persistence and state restoration

2. **PKCE Implementation**:
   - Verifying code challenge generation matches the spec
   - Testing code verifier and challenge matching
   - Ensuring proper base64url encoding

### JWKS Key Rotation Testing

JWKS key rotation scenarios are thoroughly tested:

1. **Basic Key Rotation**:
   - Testing verification with older keys after rotation
   - Testing verification with newer keys after rotation
   - Testing overlapping key rotation periods

2. **Key Resolution**:
   - Testing correct key resolution by Key ID (kid)
   - Testing behavior with missing keys
   - Testing multi-key JWKS handling

3. **Error Handling**:
   - Testing JWKS fetch failures
   - Testing malformed JWKS data
   - Testing invalid signatures

### Token Inspection and Validation

Token inspection and validation is tested comprehensively:

1. **Token Format Validation**:
   - Testing JWT structure validation
   - Testing header claims validation
   - Testing payload claims validation based on token type

2. **Signature Verification**:
   - Testing verification with correct keys
   - Testing verification with invalid signatures
   - Testing behavior with missing keys

3. **Claim Validation**:
   - Testing required claims presence
   - Testing expiration/time validation
   - Testing claim format validation

## Testing Best Practices

When writing tests for IAM Tools, follow these practices:

### Security Testing

Critical security functionality should have thorough test coverage:

1. **Token Validation**:
   - Test with valid tokens
   - Test with invalid signatures
   - Test with expired tokens
   - Test with malformed tokens
   - Test with missing claims

2. **JWKS Handling**:
   - Test with valid JWKS
   - Test with missing keys
   - Test with key rotation scenarios

3. **OAuth Flows**:
   - Test PKCE code verification
   - Test state parameter validation
   - Test token exchange

### Component Testing

When testing components:

1. Focus on behavior, not implementation details
2. Use user-centric queries (`getByRole`, `getByText`) instead of implementation-specific selectors
3. Test both success and error states
4. Verify accessibility features work correctly

### API Request Testing

When testing API interactions:

1. Mock external dependencies
2. Test error handling and retry logic
3. Verify proxy functionality for CORS issues
4. Test with realistic response payloads

## Test Templates

### Unit Test Template

```typescript
import { describe, expect, test } from 'bun:test';
import { functionToTest } from '../../path/to/function';

describe('Function Name', () => {
  test('should handle happy path', () => {
    const input = {};
    const result = functionToTest(input);
    expect(result).toEqual(expectedOutput);
  });

  test('should handle error case', () => {
    const badInput = {};
    expect(() => functionToTest(badInput)).toThrow();
  });
});
```

### Integration Test Template

```tsx
import { describe, expect, test } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ComponentToTest } from '../../path/to/component';

describe('Component Integration', () => {
  test('should complete the full workflow', async () => {
    render(
      <MemoryRouter>
        <ComponentToTest />
      </MemoryRouter>
    );
    
    // Step 1: Initial interaction
    await userEvent.click(screen.getByRole('button'));
    
    // Step 2: Wait for async operations
    await waitFor(() => {
      expect(screen.getByText('Expected Result')).toBeInTheDocument();
    });
    
    // Step 3: Verify final state
    expect(screen.getByRole('status')).toHaveTextContent('Success');
  });
});
```

## Adding New Tests

When adding new features, follow this process:

1. Write test cases before or alongside implementation
2. Ensure all critical paths are covered
3. Include both success and failure scenarios
4. Run tests frequently during development

## CI Integration

The project uses GitHub Actions for continuous integration through a streamlined single-job workflow approach:

### Unified CI Workflow

Our CI pipeline follows an efficient process using a single job with sequential steps:

1. **Linting** - Runs first as it's the fastest check and provides immediate feedback
2. **Building** - Ensures the application can be built successfully
3. **Testing** - Runs comprehensive tests after confirming the code builds properly
4. **Coverage Reporting** - Generates coverage reports and uploads them as artifacts

This streamlined approach provides several benefits:
- Faster CI execution (single job setup/teardown)
- Clear error identification (you know exactly which step failed)
- Fail-fast behavior (if linting fails, we don't waste time building and testing)
- Simplified workflow management

The workflow runs on every push to the main branch and on every pull request.

See `.github/workflows/ci.yml` for the complete CI configuration.

### Security Analysis

In addition to our main CI workflow, we use CodeQL for advanced security analysis in a separate workflow, focusing on:
- Identifying security vulnerabilities
- Finding code quality issues
- Detecting common coding mistakes

## Test Coverage Monitoring

Coverage reports are generated to identify gaps in test coverage:

```bash
bun test:coverage
```

The following areas must maintain high coverage:
- JWT processing and validation (>90%)
- OAuth flows (>85%)
- Token inspection logic (>85%)
- JWKS resolution (>90%)

## Conclusion

A robust testing strategy is critical for ensuring the reliability and security of IAM Tools. The comprehensive testing approach implemented in this project helps maintain high quality standards and minimizes security risks. As the application evolves, maintaining and expanding the test suite should remain a priority.
