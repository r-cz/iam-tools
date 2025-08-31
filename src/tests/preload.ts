// This preload file configures the environment for all Bun tests

// Provide a DOM implementation for tests via happy-dom
// Must be imported before any other test setup that might touch window/document
import 'happy-dom/global'

// Import from bun:test
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

// Import DOM setup (this will configure the DOM environment)
import './utils/dom-setup';

// Set up before all tests
beforeAll(() => {
  console.log('⚙️ Test environment initialized');
});

// Clean up after all tests
afterAll(() => {
  console.log('✅ All tests completed');
});

// Export the preloaded objects to make them available in tests
export {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  test,
  expect
};
