/**
 * Sets up a simple DOM environment for Bun testing
 * This should be imported before using React Testing Library.
 */

// Set up window.location (only if not provided by happy-dom)
;(globalThis as any).window = globalThis.window || {
  location: {
    hostname: 'localhost',
    protocol: 'http:',
    port: '3000',
    host: 'localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    href: 'http://localhost:3000/',
  },
}

// Copy window properties to global
if (globalThis.window && !(globalThis as any).location) {
  Object.assign(globalThis, { location: (globalThis as any).window.location })
}

// Provide a localStorage polyfill only if not present (happy-dom supplies one)
if (!(globalThis as any).localStorage) {
  ;(globalThis as any).localStorage = {
    getItem: (_key: string) => null,
    setItem: (_key: string, _value: string) => {},
    removeItem: (_key: string) => {},
    clear: () => {},
    key: (_index: number) => null,
    length: 0,
  } as unknown as Storage
}

// Mock fetch if not available
if (!globalThis.fetch) {
  ;(globalThis as any).fetch = () => Promise.reject(new Error('fetch not implemented'))
}

// Export for tests to use
export const testEnvironment = {
  window: globalThis.window,
  cleanup: () => {
    // Clean up any global mocks here
  },
}
