import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e', // Directory for E2E tests
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in tests */
    baseURL: 'http://localhost:5174', // Set the base URL to your Vite development server

    actionTimeout: 60000, // Set default action timeout to 60 seconds
    /* Collect traces upon retaining each test failure. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
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

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Brave Browser',
    //   use: { ...devices['Desktop Chrome'], channel: 'brave' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'bun run dev:all', // Use your dev:all command to run frontend and proxy
    url: 'http://localhost:5174', // Use the correct Vite development server URL
    reuseExistingServer: !process.env.CI, // Allow reusing existing server outside of CI
    timeout: 60 * 1000, // Increase timeout to 60 seconds (default is 30 seconds)
  },
});