# Playwright Developer Workflow

This guide outlines how to effectively integrate Playwright testing into your development workflow for IAM Tools. Following these practices helps ensure that E2E tests catch regressions and validate new features effectively.

## Table of Contents

- [When to Write E2E Tests](#when-to-write-e2e-tests)
- [Development Workflow with Tests](#development-workflow-with-tests)
- [Test-Driven Development Approach](#test-driven-development-approach)
- [Updating Tests for Feature Changes](#updating-tests-for-feature-changes)
- [Code Review Guidelines](#code-review-guidelines)
- [Continuous Integration Workflow](#continuous-integration-workflow)
- [Maintaining Test Quality](#maintaining-test-quality)

## When to Write E2E Tests

### Critical User Flows

Always write E2E tests for critical user journeys:

1. **Token Inspector**:
   - Entering and parsing JWT tokens
   - Token verification with JWKS
   - Saving/loading tokens from history

2. **OIDC Explorer**:
   - Entering and fetching provider configurations
   - Displaying provider information
   - Retrieving JWKS from providers

3. **OAuth Playground**:
   - Executing OAuth flows (Auth Code with PKCE, Client Credentials)
   - Token exchange
   - Token introspection and userinfo requests

### New Features

Write E2E tests whenever you:

1. **Add a new feature** or component
   - Create tests that verify core functionality works
   - Include tests for edge cases and error states

2. **Fix a significant bug**
   - Add a regression test that would have caught the bug
   - Verify both the fix and surrounding functionality

3. **Make architectural changes**
   - Test key user flows affected by the changes
   - Verify performance hasn't been adversely impacted

### When Not to Use E2E Tests

Not everything needs E2E testing:

1. **Implementation details** that don't affect UI behavior
   - Use unit or integration tests instead

2. **Purely visual changes** with no functional impact
   - Consider visual tests if appearance is critical

3. **Administrative features** that aren't part of core user flows
   - Focus on high-impact functionality first

## Development Workflow with Tests

### Recommended Workflow

1. **Start Local Development Environment**:
   ```bash
   # Start both vite and proxy servers
   bun run dev:all
   ```

2. **Create or Modify Feature**:
   - Implement the feature or fix
   - Manually verify it works as expected

3. **Write or Update Tests**:
   ```bash
   # Create a new test file or modify existing tests
   # Run tests on a single browser during development
   bun run test:e2e:chromium
   ```

4. **Use Test UI for Interactive Debugging** (if needed):
   ```bash
   bun run test:e2e:ui
   ```

5. **Run Full Test Suite**:
   ```bash
   # Run tests on all browsers before committing
   bun run test:e2e
   ```

6. **Commit Changes**:
   - Include both feature code and tests in the same commit
   - Reference test coverage in commit message

### Working with Automated Test Generation

Use Playwright's codegen tool to help create initial tests:

```bash
# Start codegen tool
bun run test:e2e:codegen
```

1. Use the recorder to perform your user flow
2. Modify the generated code to follow project patterns:
   - Replace direct selectors with page object methods
   - Add proper assertions
   - Add comments explaining the test purpose

## Test-Driven Development Approach

### TDD with Playwright

1. **Write the Test First**:
   ```typescript
   // Implement test for feature that doesn't exist yet
   test('user can filter tokens by claim value', async ({ page }) => {
     const tokenPage = new TokenInspectorPage(page);
     await tokenPage.navigate();
     await tokenPage.enterToken(testTokens.valid);
     
     // Feature to be implemented
     await tokenPage.filterByClaim('sub', '1234567890');
     
     // Expected behavior after implementation
     await expect(tokenPage.getClaimHighlight('sub')).toBeVisible();
     await expect(tokenPage.getFilterBadge()).toContainText('sub: 1234567890');
   });
   ```

2. **Run the Test** (it should fail)

3. **Implement the Feature**:
   - Add the filter functionality to the Token Inspector
   - Ensure it meets the requirements in the test

4. **Run Test Again** (should pass)

5. **Refine and Refactor**:
   - Improve both the implementation and test as needed

### Breaking Down Complex Features

For large features, use tests to guide incremental development:

1. **Create a test file** with multiple tests for different aspects
2. **Start with a skeleton implementation** that passes basic tests
3. **Gradually enhance both tests and implementation** to cover edge cases

## Updating Tests for Feature Changes

### Process for Updating Tests

1. **Understand the Impact**:
   - Identify which tests will be affected by your changes
   - Determine if new tests are needed

2. **Update Tests Alongside Code**:
   ```bash
   # Run specific tests to see what breaks
   npx playwright test tests/token-inspector.spec.ts
   ```

3. **Update Test Implementation**:
   - Modify page objects and selectors
   - Update test expectations
   - Add new tests for new functionality

4. **Update Visual Baselines** (if needed):
   ```bash
   bun run test:e2e -- -u
   ```

### Handling Breaking Changes

When making breaking changes to components:

1. **Update selectors** in component-selectors.ts
2. **Run affected tests** to find failures
3. **Fix test issues** before completing implementation

## Code Review Guidelines

### Reviewing Test Code

When reviewing PRs with test changes, verify:

1. **Test Coverage**:
   - Do tests cover critical paths?
   - Are edge cases and error scenarios tested?
   - Is there appropriate coverage for the feature scope?

2. **Test Quality**:
   - Do tests follow the project's patterns (Page Objects, etc.)?
   - Are selectors robust and maintainable?
   - Are assertions meaningful and specific?

3. **Test Independence**:
   - Are tests isolated and not dependent on each other?
   - Is test data properly managed?

4. **Test Performance**:
   - Are tests efficient without unnecessary actions?
   - Is setup/teardown optimized?

### Checklist for Test Reviewers

✅ Tests focus on behaviors, not implementation details  
✅ Selectors use data-testid or semantic roles when possible  
✅ Assertions validate the correct behaviors  
✅ Tests are reliable (not flaky)  
✅ Tests follow the AAA pattern (Arrange-Act-Assert)  
✅ Error cases and edge conditions are tested  
✅ Documentation is added/updated as needed  

## Continuous Integration Workflow

### Working with CI Tests

IAM Tools runs Playwright tests in CI on every pull request:

1. **Check CI Results** after pushing changes:
   - Review test failures in the PR checks
   - Check artifacts (screenshots, videos) for failed tests

2. **Fix Issues Fast**:
   ```bash
   # Run tests with CI config locally to reproduce failures
   playwright test --config=playwright/config/ci.config.ts
   ```

3. **Iterate and Improve**:
   - Push fixes promptly
   - Watch CI to confirm resolution

### Understanding CI Differences

Key differences in CI environment:

1. **CI uses Chromium only** for speed
2. **Tests run serially** (1 worker)
3. **Headless browser mode** is used
4. **Timeouts may differ** from local environment

## Maintaining Test Quality

### Regular Maintenance

1. **Periodic Test Audits**:
   - Review and update outdated tests
   - Remove redundant tests
   - Check for brittle selectors

2. **Test Efficiency Reviews**:
   ```bash
   # Run with timing data
   playwright test --reporter=html
   # Then check test duration in the HTML report
   ```

3. **Refactor Common Patterns**:
   - Move repeated test code to fixtures or helpers
   - Consolidate similar test approaches

### Test Quality Metrics

Track these metrics to maintain quality:

1. **Test Reliability**: Percentage of test runs that pass
2. **Test Coverage**: Core user flows covered by E2E tests
3. **Test Maintenance Cost**: Time spent fixing broken tests
4. **Test Run Duration**: Total time to execute the test suite

## Feature-Specific Workflow Examples

### Token Inspector Workflow

Example workflow for adding a new Token Inspector feature:

1. **Define the feature**: "Allow users to copy individual claims to clipboard"

2. **Create a test**:
   ```typescript
   test('user can copy individual claims to clipboard', async ({ page }) => {
     const tokenPage = new TokenInspectorPage(page);
     await tokenPage.navigate();
     await tokenPage.enterToken(testTokens.valid);
     
     // Test the new feature
     await tokenPage.getClaimCopyButton('sub').click();
     
     // Verify clipboard content (using page evaluation)
     const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
     expect(clipboardText).toBe('1234567890');
   });
   ```

3. **Implement the feature**:
   - Add copy buttons to claim display
   - Implement clipboard functionality
   - Add visual feedback for copy action

4. **Refine tests and implementation**:
   - Handle clipboard permissions
   - Test fallback mechanisms
   - Add tests for edge cases

### OIDC Explorer Workflow

Example workflow for enhancing OIDC Explorer:

1. **Define the enhancement**: "Add provider logo detection for common IdPs"

2. **Create tests**:
   ```typescript
   for (const provider of ['google', 'auth0', 'okta', 'azure']) {
     test(`detects ${provider} provider from issuer URL`, async ({ page }) => {
       const oidcPage = new OidcExplorerPage(page);
       
       // Mock configuration with issuer URL pattern for this provider
       await mockOidcConfigForProvider(page, provider);
       
       await oidcPage.navigate();
       await oidcPage.fetchConfiguration(`https://example-${provider}.com/.well-known/openid-configuration`);
       
       // Verify logo detection
       await expect(oidcPage.providerLogo).toBeVisible();
       await expect(oidcPage.providerName).toContainText(provider, { ignoreCase: true });
     });
   }
   ```

3. **Implement provider detection**:
   - Add provider URL pattern matching
   - Add provider logos
   - Implement the detection logic

4. **Verify and refine**:
   - Test with real provider URLs
   - Handle edge cases (similar domains, etc.)

## Developer Best Practices

### Writing Maintainable Tests

1. **Keep tests focused**:
   - Test one behavior per test
   - Use clear, descriptive test names

2. **Organize tests logically**:
   - Group related tests with `test.describe`
   - Match test file structure to application structure

3. **Optimize test speed**:
   - Minimize unnecessary actions
   - Reuse setup when appropriate

4. **Document complex tests**:
   - Add comments explaining the purpose and approach
   - Document any non-obvious test setup

### Collaborative Testing

1. **Pair on test writing** for complex features

2. **Share testing patterns** and approaches with the team

3. **Document test failures** to help others understand issues

4. **Create test fixtures** that benefit the whole team

### Continuous Learning

1. **Review Playwright documentation** for new features:
   - [Playwright docs](https://playwright.dev/docs/intro)
   - [Test assertions](https://playwright.dev/docs/test-assertions)

2. **Explore test examples** in the Playwright repository:
   - [Playwright examples](https://github.com/microsoft/playwright/tree/main/examples)

3. **Share testing knowledge** with the team