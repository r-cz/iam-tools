import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './e2e/test-results',
  /* Maximum time one test can run */
  timeout: 30 * 1000,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: './e2e/test-report' }],
    ['list']
  ],
  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:5173',
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    /* Record video for failed tests */
    video: 'on-first-retry',
    /* Capture screenshot for failed tests */
    screenshot: 'only-on-failure',
  },
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* Test against mobile viewports */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'bun run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'bun run proxy',
      port: 8788,
      reuseExistingServer: !process.env.CI,
    }
  ],
});