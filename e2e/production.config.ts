import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const appPort = Number(process.env.E2E_PRODUCTION_PORT ?? '8791')
if (!Number.isInteger(appPort) || appPort < 1 || appPort > 65535) {
  throw new Error('E2E_PRODUCTION_PORT must be an integer between 1 and 65535')
}

const appBaseUrl = `http://127.0.0.1:${appPort}`
const stateDirectory = `/tmp/iam-tools-e2e-production-state-${appPort}`

export default defineConfig({
  testDir: './production',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 3,
  reporter: 'list',
  outputDir: '/tmp/iam-tools-e2e-production-results',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: appBaseUrl,
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    command: `bun run build && bunx wrangler dev --ip 127.0.0.1 --port ${appPort} --local --persist-to ${stateDirectory}`,
    url: appBaseUrl,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
