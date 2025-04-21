// src/tests/utils/test-utils.ts
import { afterEach } from 'bun:test';
import { type ProxyFetch } from '../../lib/proxy-fetch';

/**
 * Create a mock for fetch that can be used to simulate API responses
 * @returns A mock fetch function and utilities to control its behavior
 */
export function createFetchMock() {
  // Store mock responses by URL
  const mockResponses = new Map<string, any>();
  
  // Keep track of calls for assertions
  const calls: Array<{ url: string, options?: RequestInit }> = [];
  
  // Create the mock function
  const mockFetch = async (url: string, options?: RequestInit): Promise<Response> => {
    // Record the call
    calls.push({ url, options });
    
    // Get the mock response
    const response = mockResponses.get(url);
    
    if (response instanceof Error) {
      throw response;
    }
    
    if (!response) {
      throw new Error(`No mock response for URL: ${url}`);
    }
    
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  };
  
  return {
    fetch: mockFetch,
    mockResponse: (url: string, data: any) => {
      mockResponses.set(url, data);
    },
    mockError: (url: string, error: Error) => {
      mockResponses.set(url, error);
    },
    clearMocks: () => {
      mockResponses.clear();
      calls.length = 0;
    },
    getCalls: () => [...calls],
  };
}

/**
 * Create a mock for proxy-fetch that simulates the behavior of calling APIs through a CORS proxy
 * @returns A mock proxy-fetch function and utilities
 */
export function createProxyFetchMock() {
  const { fetch, mockResponse, mockError, clearMocks, getCalls } = createFetchMock();
  
  const proxyFetch: ProxyFetch = async (url: string, options?: RequestInit) => {
    // The proxy-fetch implementation would transform the URL to go through a proxy
    // Here we just directly use the mock fetch
    return fetch(url, options);
  };
  
  return {
    proxyFetch,
    mockResponse,
    mockError,
    clearMocks,
    getCalls,
  };
}

/**
 * Create storage mock for localStorage and sessionStorage tests
 * @returns A mock storage implementation
 */
export function createStorageMock() {
  let store: Record<string, string> = {};
  
  const storageMock = {
    getItem: (key: string): string | null => {
      return key in store ? store[key] : null;
    },
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    key: (index: number): string | null => {
      return Object.keys(store)[index] || null;
    },
    get length(): number {
      return Object.keys(store).length;
    }
  };
  
  // Clear storage after each test
  afterEach(() => {
    storageMock.clear();
  });
  
  return storageMock;
}

/**
 * Create a timeout Promise that resolves after the specified duration
 * @param ms Time in milliseconds to wait
 * @returns A Promise that resolves after the specified duration
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Utility to mock window location for testing URL-based functionality
 */
export function mockWindowLocation(url: string) {
  // Save original location
  const originalLocation = window.location;
  
  // Define a custom location object
  const locationMock = new URL(url);
  
  // Override window.location with getter and setter
  Object.defineProperty(window, 'location', {
    writable: true,
    value: locationMock
  });
  
  // Return a cleanup function to restore the original location
  return () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation
    });
  };
}

/**
 * Mock console methods for testing
 * @returns Object with mock console methods and utilities
 */
export function mockConsole() {
  // Store original methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };
  
  // Create call records
  const calls = {
    log: [] as any[],
    error: [] as any[],
    warn: [] as any[],
    info: [] as any[],
    debug: [] as any[],
  };
  
  // Install mocks
  console.log = (...args: any[]) => {
    calls.log.push(args);
  };
  
  console.error = (...args: any[]) => {
    calls.error.push(args);
  };
  
  console.warn = (...args: any[]) => {
    calls.warn.push(args);
  };
  
  console.info = (...args: any[]) => {
    calls.info.push(args);
  };
  
  console.debug = (...args: any[]) => {
    calls.debug.push(args);
  };
  
  // Return utilities and restore function
  return {
    calls,
    restore: () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    }
  };
}
