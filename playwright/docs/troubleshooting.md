# Playwright Troubleshooting Guide

This guide addresses common issues you might encounter when working with Playwright tests in IAM Tools and provides solutions to resolve them.

## Table of Contents

- [Common Issues and Solutions](#common-issues-and-solutions)
- [Debugging Techniques](#debugging-techniques)
- [CI-Specific Troubleshooting](#ci-specific-troubleshooting)
- [Performance Optimization](#performance-optimization)
- [Working with Flaky Tests](#working-with-flaky-tests)

## Common Issues and Solutions

### Selectors Not Finding Elements

**Problem**: `Test timeout of 30000ms exceeded` or `Error: Locator.click: Target element not found`

**Solutions**:

1. **Verify the selector**:
   - Use `page.pause()` to inspect the DOM state
   - Try alternative selector strategies:
     ```typescript
     // Instead of:
     page.getByTestId('non-existent-id');
     
     // Try:
     page.getByRole('button', { name: 'Submit' });
     page.getByText('Submit');
     page.locator('button:has-text("Submit")');
     ```

2. **Check if element is in the DOM but not visible**:
   ```typescript
   // Check if element exists in DOM
   await expect(page.getByTestId('my-element')).toBeAttached();
   ```

3. **Add data-testid attributes** to make selectors more robust:
   ```jsx
   // Add to React component
   <button data-testid="submit-button">Submit</button>
   
   // Then in test
   await page.getByTestId('submit-button').click();
   ```

4. **Wait for element to be ready**:
   ```typescript
   await page.getByTestId('dynamic-element').waitFor({ state: 'visible' });
   await page.getByTestId('dynamic-element').click();
   ```

### Network Request Issues

**Problem**: Tests fail when interacting with the CORS proxy or external APIs

**Solutions**:

1. **Check if the CORS proxy is running**:
   - Ensure `bun run proxy` is running in a separate terminal or use `bun run dev:all`
   - Verify proxy is listening on port 8788

2. **Mock network requests** that are unreliable:
   ```typescript
   await page.route('**/api/cors-proxy/**', (route) => {
     route.fulfill({
       status: 200,
       contentType: 'application/json',
       body: JSON.stringify({ /* mock response */ })
     });
   });
   ```

3. **Handle rate limiting** for external APIs:
   ```typescript
   test.describe.configure({ mode: 'serial' });
   ```

4. **Add retry logic** for unstable network operations:
   ```typescript
   for (let i = 0; i < 3; i++) {
     try {
       await page.getByRole('button', { name: 'Fetch Configuration' }).click();
       await expect(page.getByTestId('config-display')).toBeVisible({ timeout: 10000 });
       break; // Success, exit the retry loop
     } catch (e) {
       if (i === 2) throw e; // Re-throw on last attempt
       console.log('Retrying fetch operation...');
     }
   }
   ```

### Timing Issues

**Problem**: Tests fail intermittently with timing-related errors

**Solutions**:

1. **Use proper waiting mechanisms** instead of arbitrary delays:
   ```typescript
   // Avoid:
   await page.waitForTimeout(2000);
   
   // Better:
   await expect(page.getByTestId('results')).toBeVisible();
   ```

2. **Increase timeouts for slow operations**:
   ```typescript
   await expect(page.getByTestId('slow-loading-element')).toBeVisible({ timeout: 30000 });
   ```

3. **Wait for network idle**:
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

4. **Check for race conditions** in the application code that might affect tests

### State Management Problems

**Problem**: Tests fail because of shared state or local storage issues

**Solutions**:

1. **Clear local storage** before each test:
   ```typescript
   test.beforeEach(async ({ page }) => {
     await page.evaluate(() => window.localStorage.clear());
   });
   ```

2. **Use unique test data** to prevent collisions:
   ```typescript
   const uniqueId = Date.now().toString();
   await page.getByLabel('Client ID').fill(`test-client-${uniqueId}`);
   ```

3. **Avoid dependencies between tests** - each test should be self-contained

### Visual Testing Failures

**Problem**: Screenshot comparisons fail despite no apparent UI changes

**Solutions**:

1. **Mask dynamic content** in screenshots:
   ```typescript
   await expect(page).toHaveScreenshot('homepage.png', {
     mask: [
       page.getByTestId('timestamp'),
       page.getByTestId('random-content')
     ]
   });
   ```

2. **Update screenshots** when UI intentionally changes:
   ```bash
   bun run test:e2e -- -u
   ```

3. **Check for browser/OS differences** that affect rendering:
   ```typescript
   // Specify per-browser screenshots
   await expect(page).toHaveScreenshot(`dashboard-${browserName}.png`);
   ```

## Debugging Techniques

### Playwright Inspector

The Playwright Inspector is a powerful visual debugging tool:

1. **Launch tests in debug mode**:
   ```bash
   bun run test:e2e:debug
   ```

2. **Add pause points in your test code**:
   ```typescript
   test('debugging example', async ({ page }) => {
     await page.goto('/');
     await page.pause(); // Execution will pause here
     await page.getByRole('button').click();
   });
   ```

3. **Using the inspector**:
   - Step through test actions
   - Inspect the DOM
   - Try selectors with the picker tool
   - View console logs and network requests

### Trace Viewer

Playwright's Trace Viewer helps debug failed tests:

1. **Enable traces** in the test config (already configured in IAM Tools):
   ```typescript
   use: {
     trace: 'on-first-retry', // or 'on', 'retain-on-failure'
   }
   ```

2. **View traces** from a failed test run:
   ```bash
   npx playwright show-trace e2e/test-results/token-inspector-test/trace.zip
   ```

3. **Trace features**:
   - Timeline view of all actions
   - DOM snapshots at each step
   - Network requests
   - Console logs
   - Source code location

### Console and Network Logging

Enhanced logging to diagnose issues:

1. **Log browser console messages**:
   ```typescript
   page.on('console', (msg) => {
     console.log(`BROWSER CONSOLE: ${msg.text()}`);
   });
   ```

2. **Log network requests**:
   ```typescript
   page.on('request', (request) => {
     console.log(`>> ${request.method()} ${request.url()}`);
   });
   
   page.on('response', (response) => {
     console.log(`<< ${response.status()} ${response.url()}`);
   });
   ```

3. **Save HAR files** for network analysis:
   ```typescript
   const context = await browser.newContext({
     recordHar: { path: 'test-requests.har' }
   });
   const page = await context.newPage();
   // ... test steps ...
   await context.close(); // Saves the HAR file
   ```

### Verbose Mode

Run Playwright with detailed logs:

```bash
DEBUG=pw:api bun run test:e2e
```

## CI-Specific Troubleshooting

### Diagnosing CI Failures

Common CI issues and solutions:

1. **Tests pass locally but fail in CI**:
   - Check for environment differences (viewport size, browser version)
   - Look for timing issues that are amplified in CI environments
   - Verify resources are properly loaded in headless mode

2. **Review CI artifacts**:
   - Screenshots (`test-results/*/screenshots/`)
   - Videos (`test-results/*/videos/`)
   - Traces (`test-results/*/traces/`)
   - Test report (`test-report/index.html`)

3. **Reproduce CI environment locally**:
   ```bash
   # Run tests with CI configuration
   playwright test --config=playwright/config/ci.config.ts
   ```

### Handling CI Resource Constraints

1. **Optimize for CI environment**:
   ```typescript
   // Use fewer browsers in CI to save resources
   projects: process.env.CI ? [
     { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
   ] : [
     // Full browser list for local development
   ]
   ```

2. **Run only critical tests** in CI:
   ```typescript
   test('critical user flow', async ({ page }) => {
     // Test implementation
   });
   
   // Skip non-critical tests in CI
   test.skip(!!process.env.CI, 'visual tests are only run locally')
   ('visual regression test', async ({ page }) => {
     // Test implementation
   });
   ```

3. **Shard tests** for parallel execution:
   ```bash
   # In CI pipeline
   npx playwright test --shard=1/3
   npx playwright test --shard=2/3
   npx playwright test --shard=3/3
   ```

### Troubleshooting CI-Specific Timeouts

1. **Adjust timeouts** for CI environment:
   ```typescript
   // In playwright/config/ci.config.ts
   export default defineConfig({
     timeout: 60 * 1000, // Longer timeout for CI
     expect: {
       timeout: 20 * 1000, // Longer expect timeout
     },
   });
   ```

2. **Optimize test startup**:
   - Reuse browser instances where possible
   - Minimize unnecessary setup/teardown

## Performance Optimization

### Speed Up Tests

1. **Run tests in parallel** (configured by default):
   ```typescript
   // In playwright.config.ts
   export default defineConfig({
     workers: process.env.CI ? 1 : undefined, // Use all available cores locally
   });
   ```

2. **Reuse authentication state**:
   ```typescript
   // Store authentication state
   await context.storageState({ path: 'auth.json' });
   
   // Reuse in future tests
   const context = await browser.newContext({
     storageState: 'auth.json'
   });
   ```

3. **Group related tests** to avoid redundant setup:
   ```typescript
   test.describe('Token inspector', () => {
     test.beforeEach(async ({ page }) => {
       // Common setup once for all tests
     });
     
     test('feature 1', async ({ page }) => {/*...*/});
     test('feature 2', async ({ page }) => {/*...*/});
     test('feature 3', async ({ page }) => {/*...*/});
   });
   ```

### Optimize Resource Usage

1. **Limit browser usage**:
   ```typescript
   // Only run Chromium tests during development
   npx playwright test --project=chromium
   ```

2. **Minimize visual comparisons**:
   - Only capture screenshots when needed
   - Use the smallest viewport necessary

## Working with Flaky Tests

### Identifying Flaky Tests

1. **Run tests multiple times**:
   ```bash
   for i in {1..10}; do bun run test:e2e:chromium; done
   ```

2. **Use built-in retry** capabilities:
   ```typescript
   // In playwright.config.ts
   export default defineConfig({
     retries: 2, // Retry failed tests twice
   });
   ```

### Fixing Flaky Tests

1. **Add explicit waiting conditions**:
   ```typescript
   // Wait for specific state changes
   await expect(page.getByTestId('status')).toHaveText('Complete');
   
   // Wait for network requests to complete
   await page.waitForLoadState('networkidle');
   ```

2. **Use test isolation**:
   ```typescript
   test.describe.configure({ mode: 'parallel' });
   ```

3. **Mock external dependencies** that cause instability:
   ```typescript
   // Mock time-dependent functions
   await page.addInitScript(() => {
     Date.now = () => 1609459200000; // Fixed timestamp
   });
   ```

4. **Temporarily mark tests as flaky**:
   ```typescript
   test.fixme('temporarily skip flaky test', async ({ page }) => {
     // Test will be skipped but marked in report
   });
   ```

### Logging and Monitoring

1. **Add enhanced logging** for flaky tests:
   ```typescript
   test('suspected flaky test', async ({ page }) => {
     console.log('Starting test execution');
     await page.goto('/token-inspector');
     console.log('Navigation complete, DOM state:', 
       await page.evaluate(() => document.body.innerHTML)
     );
     // Continue test with logging...
   });
   ```

2. **Keep a history** of flaky test occurrences to track patterns

## Advanced Troubleshooting

### Dealing with Browser-Specific Issues

1. **Debug browser differences**:
   ```typescript
   test('browser-specific test', async ({ page, browserName }) => {
     // Apply browser-specific handling
     if (browserName === 'webkit') {
       // Safari-specific workaround
     } else if (browserName === 'firefox') {
       // Firefox-specific handling
     }
   });
   ```

2. **Skip tests on problematic browsers**:
   ```typescript
   test('feature not supported in Safari', async ({ page, browserName }) => {
     test.skip(browserName === 'webkit', 'Feature not supported in Safari');
     // Test implementation
   });
   ```

### Working with iframes and Complex UIs

1. **Access iframe content**:
   ```typescript
   const frame = page.frameLocator('iframe[name="preview"]');
   await frame.getByRole('button', { name: 'Submit' }).click();
   ```

2. **Handle complex interactions** like drag and drop:
   ```typescript
   await page.getByTestId('drag-source').dragTo(page.getByTestId('drop-target'));
   ```

### Debugging Mobile Viewports

1. **Test mobile-specific behavior**:
   ```typescript
   test('mobile navigation menu', async ({ page }) => {
     // Set mobile viewport if not using a mobile project
     await page.setViewportSize({ width: 375, height: 667 });
     
     // Open mobile menu (often different from desktop)
     await page.getByTestId('mobile-menu-button').click();
     
     // Verify mobile-specific elements
     await expect(page.getByTestId('mobile-nav')).toBeVisible();
   });
   ```

2. **Test touch gestures**:
   ```typescript
   await page.getByTestId('card').tap();
   ```