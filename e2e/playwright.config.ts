import { defineConfig, devices } from '@playwright/test'

const appPort = process.env.E2E_APP_PORT ?? '5174'
const proxyPort = '8788'
const appBaseUrl = `http://127.0.0.1:${appPort}`
const proxyBaseUrl = `http://localhost:${proxyPort}`

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 10,
  reporter: 'html',
  timeout: 30000, // 30s per test for stability
  expect: {
    timeout: 5000, // 5s for assertions
  },
  use: {
    baseURL: appBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 5000, // 5s per action
    navigationTimeout: 10000, // 10s for navigation
  },

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
  ],

  webServer: [
    {
      command: `bun run dev -- --host 127.0.0.1 --port ${appPort} --strictPort`,
      url: appBaseUrl,
      reuseExistingServer: false,
      timeout: 120 * 1000,
    },
    {
      command: 'bun run proxy',
      url: `${proxyBaseUrl}/api/.well-known/openid-configuration`,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
})
