/**
 * Sets up a simple DOM environment for Bun testing
 * This should be imported before using React Testing Library.
 */

// Set up window.location
(globalThis as any).window = globalThis.window || {
  location: {
    hostname: 'localhost',
    protocol: 'http:',
    port: '3000',
    host: 'localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    href: 'http://localhost:3000/'
  }
};

// Copy window properties to global
if (globalThis.window) {
  Object.assign(globalThis, {
    location: globalThis.window.location
  });
}

// Mock localStorage
(globalThis as any).localStorage = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
  clear: () => {},
  key: (index: number) => null,
  length: 0
};

// Mock fetch if not available
if (!globalThis.fetch) {
  (globalThis as any).fetch = () => Promise.reject(new Error('fetch not implemented'));
}

// Export for tests to use
export const testEnvironment = {
  window: globalThis.window,
  cleanup: () => {
    // Clean up any global mocks here
  }
};