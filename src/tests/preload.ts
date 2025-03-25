// This preload file configures the environment for all Bun tests

// Import from bun:test
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

// Set up a minimal DOM environment
if (typeof window === 'undefined') {
  // This is a minimal mock, not a full DOM implementation
  globalThis.window = {} as any;
  globalThis.document = {
    createElement: () => ({}),
    body: { appendChild: () => {} }
  } as any;
}

// Mock localStorage
if (!globalThis.localStorage) {
  globalThis.localStorage = {
    getItem: (key: string) => null,
    setItem: (key: string, value: string) => {},
    removeItem: (key: string) => {},
    clear: () => {},
    key: (index: number) => null,
    length: 0
  };
}

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
  expect,
  mock
};
