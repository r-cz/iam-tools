# Visual Testing Guide

This guide covers how to implement visual testing with Playwright in IAM Tools, ensuring UI consistency across different browsers and code changes.

## Table of Contents

- [Introduction to Visual Testing](#introduction-to-visual-testing)
- [Setting Up Visual Tests](#setting-up-visual-tests)
- [Creating Baseline Screenshots](#creating-baseline-screenshots)
- [Comparing Screenshots](#comparing-screenshots)
- [Handling Dynamic Content](#handling-dynamic-content)
- [Theme Testing](#theme-testing)
- [Viewport Testing](#viewport-testing)
- [Maintenance and Updates](#maintenance-and-updates)
- [Best Practices](#best-practices)
- [Advanced Techniques](#advanced-techniques)

## Introduction to Visual Testing

Visual testing helps ensure UI consistency by comparing screenshots of the application against known baseline images. This is particularly valuable for IAM Tools where:

- The UI needs to work across different browsers and screen sizes
- Components need to display complex data (JWTs, OIDC configurations) consistently
- Theme switching between light/dark modes must be consistent

Key benefits:

- Catch unintended visual regressions
- Maintain a consistent user experience
- Document the expected appearance of the application

## Setting Up Visual Tests

### Configuration

Playwright is already configured for screenshot testing in IAM Tools. The settings are in `playwright.config.ts`:

```typescript
// Screenshot configuration in playwright.config.ts
export default defineConfig({
  // ... other config
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100, // Allow minor pixel differences
      threshold: 0.3,     // Pixel comparison threshold (0.3 = 30%)
    }
  },
  // ... more config
});
```

### Directory Structure

Screenshot baselines and diffs are stored in:

```
e2e/
├── tests/                  # Test files
├── test-results/           # Test run results
│   └── visual-test/        # Results from a specific test
│       ├── screenshots/    # Captured screenshots
│       └── diff/           # Difference images
└── screenshots/            # Baseline screenshots (committed)
```

## Creating Baseline Screenshots

### Basic Screenshot Test

To create your first visual test:

```typescript
import { test, expect } from '@playwright/test';
import { TokenInspectorPage } from '../pages/token-inspector-page';

test('token display appearance', async ({ page }) => {
  // Set up
  const tokenPage = new TokenInspectorPage(page);
  await tokenPage.navigate();
  await tokenPage.enterToken(testTokens.valid);
  
  // Take screenshot of the token display
  await expect(page.getByTestId('token-display')).toHaveScreenshot('token-display.png');
});
```

### Generate Baseline Images

Run the test to generate baseline screenshots:

```bash
# Generate baseline screenshots for a specific test
npx playwright test tests/visual/token-inspector-visual.spec.ts

# When prompted that screenshots don't exist, update them:
npx playwright test tests/visual/token-inspector-visual.spec.ts --update-snapshots
# Or:
bun run test:e2e -- -u
```

### Commit Baseline Images

Commit the baseline screenshots to the repository:

```bash
git add e2e/screenshots/
git commit -m "Add baseline screenshots for token inspector"
```

## Comparing Screenshots

### Running Visual Tests

Run visual tests just like any other Playwright test:

```bash
# Run all visual tests
bun run test:e2e

# Run specific visual tests
npx playwright test tests/visual/
```

### Handling Failures

When a visual test fails:

1. **View the diff** in the HTML report:
   ```bash
   bun run test:e2e:report
   ```

2. **Examine the differences**:
   - Look at the baseline image, actual image, and diff image
   - Red pixels indicate differences

3. **Decide whether to**:
   - Fix the code to match the baseline
   - Update the baseline to accept the new appearance

4. **Update baselines** if changes are intentional:
   ```bash
   npx playwright test tests/visual/token-inspector-visual.spec.ts --update-snapshots
   ```

## Handling Dynamic Content

### Masking Dynamic Elements

To handle elements with dynamic content:

```typescript
// Mask dynamic elements to avoid flaky tests
test('dashboard appearance with masked dynamic content', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveScreenshot('dashboard.png', {
    mask: [
      // Mask elements with dynamic content
      page.getByTestId('timestamp'),
      page.getByTestId('user-name'),
      page.getByTestId('random-token-example')
    ]
  });
});
```

### Stabilizing Dynamic UI

Sometimes you need to stabilize UI before taking screenshots:

```typescript
// Stabilize the test environment
test('token timeline appearance', async ({ page }) => {
  const tokenPage = new TokenInspectorPage(page);
  await tokenPage.navigate();
  
  // Use a token with known timestamps to stabilize the timeline view
  const fixedTimestampToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
  await tokenPage.enterToken(fixedTimestampToken);
  
  // Force specific date for consistency
  await page.addInitScript(() => {
    // Override Date.now() and new Date() to return fixed timestamps
    const mockDate = new Date('2023-01-01T12:00:00Z');
    Date.now = () => mockDate.getTime();
    const OriginalDate = Date;
    // @ts-ignore
    window.Date = class extends OriginalDate {
      constructor() {
        super();
        return mockDate;
      }
    };
    // Restore other Date methods
    window.Date.UTC = OriginalDate.UTC;
    window.Date.parse = OriginalDate.parse;
    // ... other static methods
  });

  // Now take the screenshot
  await expect(page.getByTestId('token-timeline')).toHaveScreenshot('token-timeline.png');
});
```

## Theme Testing

### Test Both Light and Dark Themes

Create visual tests for both theme modes:

```typescript
test('token display appearance in both themes', async ({ page }) => {
  const tokenPage = new TokenInspectorPage(page);
  await tokenPage.navigate();
  await tokenPage.enterToken(testTokens.valid);
  
  // Light theme (default)
  await expect(page.getByTestId('token-display'))
    .toHaveScreenshot('token-display-light.png');
  
  // Toggle to dark theme
  await tokenPage.toggleTheme();
  
  // Allow theme transition to complete
  await page.waitForTimeout(300); // Brief wait for CSS transitions
  
  // Take screenshot in dark theme
  await expect(page.getByTestId('token-display'))
    .toHaveScreenshot('token-display-dark.png');
});
```

### Theme-Specific Fixtures

Create fixtures for different themes:

```typescript
// fixtures/themes.ts
import { test as base } from '@playwright/test';
import { Navigation } from '../utils/navigation';

// Extend the base test with theme fixtures
export const test = base.extend({
  // Page with dark theme active
  darkThemePage: async ({ page }, use) => {
    await page.goto('/');
    const nav = new Navigation(page);
    await nav.toggleTheme(); // Switch to dark theme
    await page.waitForTimeout(300); // Allow transition to complete
    await use(page);
  },
  
  // Page with light theme active (explicit fixture for clarity)
  lightThemePage: async ({ page }, use) => {
    await page.goto('/');
    // Ensure light theme is active (could check/set localStorage)
    await use(page);
  }
});
```

## Viewport Testing

### Testing Different Screen Sizes

Test responsive design across viewports:

```typescript
// Test on mobile viewport
test('mobile navigation menu', async ({ page }) => {
  // Set mobile viewport if not using mobile project
  await page.setViewportSize({ width: 375, height: 667 });
  
  await page.goto('/');
  
  // Verify mobile UI
  await expect(page.getByTestId('mobile-menu-button')).toBeVisible();
  await page.getByTestId('mobile-menu-button').click();
  
  // Take screenshot of mobile navigation
  await expect(page.getByTestId('mobile-nav')).toHaveScreenshot('mobile-navigation.png');
});
```

### Using Playwright Projects

IAM Tools is already configured to test on multiple viewports using projects:

```typescript
// In playwright.config.ts
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  // ...other desktop browsers
  {
    name: 'mobile-chrome',
    use: { ...devices['Pixel 5'] },
  },
  {
    name: 'mobile-safari',
    use: { ...devices['iPhone 13'] },
  },
],
```

### Viewport-Specific Tests

Some tests should only run on specific viewports:

```typescript
// Skip this test on mobile viewports
test('desktop layout has side-by-side panels', async ({ page, browserName }) => {
  // Skip on mobile projects
  test.skip(browserName.includes('mobile'), 'This test is for desktop layouts only');
  
  await page.goto('/token-inspector');
  await expect(page.getByTestId('layout')).toHaveScreenshot('desktop-layout.png');
});
```

## Maintenance and Updates

### When to Update Screenshots

Update baseline screenshots when:

1. **Intentional UI changes** are made:
   - Style updates
   - Component redesigns
   - Layout changes

2. **New features** are added with visual components

3. **Dependencies are updated** that affect rendering (React, CSS libraries)

### Update Process

```bash
# Update all screenshots
bun run test:e2e -- -u

# Update screenshots for a specific test
npx playwright test tests/visual/token-inspector-visual.spec.ts --update-snapshots

# Update screenshots for a specific test and browser
npx playwright test tests/visual/token-inspector-visual.spec.ts --project=chromium --update-snapshots
```

### Reviewing Visual Changes

When reviewing PRs with visual changes:

1. Review before/after screenshots to understand the impact
2. Check the visual changes across different viewports
3. Verify changes in both light and dark themes
4. Consider accessibility impacts of visual changes

## Best Practices

### Effective Visual Testing

1. **Don't overuse screenshots**:
   - Focus on key UI components
   - Screenshot only what's necessary
   - Prefer functional tests for non-visual features

2. **Keep screenshots focused**:
   - Capture specific components, not entire pages
   - Use `page.getByTestId('component')` to target elements

3. **Minimize flakiness**:
   - Mask dynamic content
   - Stabilize time-dependent features
   - Use consistent test data

4. **Organize screenshot baselines**:
   - Use descriptive filenames
   - Group related screenshots
   - Include browser/viewport in filename for specific cases

### CI Considerations

In CI environments:

1. **Run only essential visual tests** to save resources
2. **Consider limiting to a single browser** (e.g., chromium)
3. **Set appropriate thresholds** to allow minor rendering differences

## Advanced Techniques

### Component-Level Visual Testing

For testing specific components in isolation:

```typescript
test('token header component appearance', async ({ page }) => {
  // Navigate to the component
  await page.goto('/token-inspector');
  await page.getByTestId('token-input').fill(testTokens.valid);
  
  // Focus on just the header component
  const tokenHeader = page.getByTestId('token-header');
  
  // Ensure consistent content for visual testing
  await expect(tokenHeader.getByText('alg')).toBeVisible();
  await expect(tokenHeader.getByText('HS256')).toBeVisible();
  
  // Screenshot just this component
  await expect(tokenHeader).toHaveScreenshot('token-header-component.png');
});
```

### Visual Diff Sensitivity Adjustment

Adjust sensitivity for specific tests:

```typescript
test('color theme consistency', async ({ page }) => {
  await page.goto('/settings');
  
  // More strict comparison for color scheme verification
  await expect(page).toHaveScreenshot('color-settings.png', {
    threshold: 0.1, // Stricter comparison (10% threshold)
    maxDiffPixels: 10 // Allow very few pixel differences
  });
});
```

### Custom Screenshot Comparison

For very specific visual testing needs:

```typescript
test('branding is consistent', async ({ page }) => {
  await page.goto('/');
  
  // Take a screenshot of the logo
  const logoBuffer = await page.getByTestId('app-logo').screenshot();
  
  // Custom verification of the logo
  // This could involve image processing or custom comparison logic
  const logoHash = await computeImageHash(logoBuffer);
  expect(logoHash).toBe('expected-logo-hash');
});

async function computeImageHash(imageBuffer: Buffer) {
  // Implement a simple hash function for image comparison
  // This is just an example - you'd need to implement actual image processing
  return imageBuffer.toString('base64').slice(0, 20);
}
```

### Integrating with Design Systems

Connect visual tests with your design system:

```typescript
// Test design tokens are correctly applied
test('design tokens are applied correctly', async ({ page }) => {
  await page.goto('/token-inspector');
  
  // Extract computed styles
  const primaryButton = page.getByRole('button', { name: 'Verify Signature' });
  const buttonStyles = await primaryButton.evaluate((el) => {
    const styles = window.getComputedStyle(el);
    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      borderRadius: styles.borderRadius,
      // ... other relevant properties
    };
  });
  
  // Compare with design system tokens
  expect(buttonStyles.backgroundColor).toBe('rgb(79, 70, 229)'); // Primary color
  expect(buttonStyles.borderRadius).toBe('6px'); // Border radius token
  
  // Also take screenshot for visual reference
  await expect(primaryButton).toHaveScreenshot('primary-button.png');
});
```

This comprehensive approach to visual testing helps maintain UI consistency and catches visual regressions quickly, ensuring IAM Tools provides a consistent, high-quality user experience across all browsers and device types.