// This file sets up the test environment
import { afterAll, afterEach, beforeAll, expect } from 'bun:test';

// Create a simple DOM environment if testing in Node
if (typeof window === 'undefined') {
  globalThis.window = {} as any;
  globalThis.document = {} as any;
}

// Clean up function for tests
afterEach(() => {
  // Add cleanup logic here
});

// Global setup
beforeAll(() => {
  // Add any global test setup here
});

// Global teardown
afterAll(() => {
  // Add any global test teardown here
});

// Make expect available globally for jest-dom
globalThis.expect = expect;
