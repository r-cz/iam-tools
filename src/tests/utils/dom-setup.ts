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
  let store: Record<string, string> = {}
  ;(globalThis as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length
    },
  } as unknown as Storage
}

// Mock fetch if not available
if (!globalThis.fetch) {
  ;(globalThis as any).fetch = () => Promise.reject(new Error('fetch not implemented'))
}

// Provide DOMParser if not available (for SAML tests)
if (!(globalThis as any).DOMParser) {
  try {
    // Try to get DOMParser from happy-dom's window
    const win = (globalThis as any).window
    if (win && win.DOMParser) {
      ;(globalThis as any).DOMParser = win.DOMParser
    }
  } catch {
    // If that fails, provide a minimal mock
    ;(globalThis as any).DOMParser = class DOMParser {
      parseFromString(str: string, type: string) {
        // This is a minimal implementation - in real tests, happy-dom should provide this
        throw new Error('DOMParser not available - happy-dom may not be loaded correctly')
      }
    }
  }
}

// Export for tests to use
export const testEnvironment = {
  window: globalThis.window,
  cleanup: () => {
    // Clean up any global mocks here
  },
}
