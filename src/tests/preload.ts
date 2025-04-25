// This preload file configures the environment for all Bun tests

// Import from bun:test
import { afterAll, beforeAll } from 'bun:test';

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
