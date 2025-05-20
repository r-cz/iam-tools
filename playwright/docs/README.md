# Playwright Testing Documentation for IAM Tools

Welcome to the Playwright testing documentation for IAM Tools. This collection of guides will help you effectively write, run, and maintain end-to-end tests for our identity and access management utilities.

## Getting Started

If you're new to Playwright testing in IAM Tools, start with:

1. [Main Playwright Documentation](../README.md) - Overview and setup instructions
2. [Implementing New Tests](./implementing-new-tests.md) - How to write new tests effectively

## In-Depth Guides

These guides cover specific aspects of Playwright testing:

- [Developer Workflow](./developer-workflow.md) - How to integrate testing into your development process
- [Troubleshooting Guide](./troubleshooting.md) - Solutions for common Playwright testing issues
- [Visual Testing](./visual-testing.md) - How to implement and maintain visual regression tests
- [Mocking API Responses](./mocking-api-responses.md) - Techniques for mocking external services

## Quick Reference

| Task | Command |
|------|---------|
| Run all tests | `bun run test:e2e` |
| Run with UI | `bun run test:e2e:ui` |
| Debug tests | `bun run test:e2e:debug` |
| View test report | `bun run test:e2e:report` |
| Update screenshots | `bun run test:e2e -- -u` |
| Generate tests | `bun run test:e2e:codegen` |
| Run on specific browser | `bun run test:e2e:chromium` |

## Feature-Specific Testing

Each core feature in IAM Tools requires specific testing strategies:

### Token Inspector Testing

The Token Inspector processes and validates JWT tokens, requiring tests for:
- Token parsing and display
- Signature verification
- Expiration and timeline validation
- Claim interpretation

### OIDC Explorer Testing

OIDC Explorer fetches and interprets OpenID configurations, requiring tests for:
- Configuration fetching and parsing
- Provider identification
- JWKS retrieval and display
- Error handling for various provider edge cases

### OAuth Playground Testing

OAuth Playground simulates OAuth 2.0 flows, requiring tests for:
- Flow configuration and execution
- Token exchange
- Token introspection
- UserInfo endpoint interaction

## Contributing to Test Documentation

This documentation is a living resource. If you find gaps or have improvements:

1. Update relevant documentation files
2. Add examples for new testing patterns
3. Keep the troubleshooting guide updated with new solutions
4. Submit documentation changes alongside code changes

## Additional Resources

- [Playwright Official Documentation](https://playwright.dev/docs/intro)
- [Test Selectors Guide](https://playwright.dev/docs/selectors)
- [UI Mode Documentation](https://playwright.dev/docs/test-ui-mode)
- [Trace Viewer Guide](https://playwright.dev/docs/trace-viewer-intro)