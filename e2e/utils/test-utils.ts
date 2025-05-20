import { test as base, expect } from '@playwright/test';
import { TokenInspectorPO } from '../page-objects/token-inspector.po';

/**
 * Extend the Playwright test fixture to include our page objects
 */
export const test = base.extend({
  tokenInspectorPage: async ({ page }, use) => {
    const tokenInspectorPage = new TokenInspectorPO(page);
    await use(tokenInspectorPage);
  }
});

/**
 * A collection of sample JWT tokens for testing
 */
export const TEST_TOKENS = {
  VALID: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  EXPIRED: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjN9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ',
  MALFORMED: 'invalid.token.format'
};

/**
 * Wait for a specific amount of time (use sparingly)
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Custom assertions
 */
export { expect };