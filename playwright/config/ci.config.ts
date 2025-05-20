import { defineConfig, devices } from '@playwright/test';
import baseConfig from '../../playwright.config';

/**
 * CI-specific Playwright configuration.
 * This can be used by creating a script that runs:
 * playwright test --config=playwright/config/ci.config.ts
 */
export default defineConfig({
  ...baseConfig,
  // Override settings for CI environment
  workers: 1,
  retries: 2,
  reporter: ['html', 'github'],
  
  // For CI, we only run on chromium to save time
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  // Override web server settings for CI
  webServer: [
    {
      command: 'bun run preview',
      port: 4173,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'bun run proxy',
      port: 8788,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    }
  ],
});