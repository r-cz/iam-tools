// src/tests/setup.ts - Enhanced test environment setup
import { afterEach, afterAll, beforeAll, beforeEach, mock, spyOn } from 'bun:test';

// Add DOM testing utilities
import '@testing-library/jest-dom';

// Mock fetch API by default
global.fetch = mock(() => {
  return Promise.resolve(new Response(JSON.stringify({ mocked: true }), {
    headers: { 'Content-Type': 'application/json' }
  }));
}) as any;

// Store original environment for restoration
const originalEnv = { ...process.env };

// Clean up after each test
afterEach(() => {
  // Reset fetch mock
  mock.reset(global.fetch);
  
  // Clean up any document body changes to avoid test interference
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
    
    // Clear any query parameters in the URL
    history.replaceState({}, '', window.location.pathname);
  }
});

// Global setup
beforeAll(() => {
  // Setup for crypto APIs if needed in the test environment
  if (typeof crypto === 'undefined') {
    // Provide a minimal crypto implementation for testing
    global.crypto = {
      subtle: {
        digest: async (algorithm: string, data: BufferSource) => {
          // This is a minimal mock for SHA-256 to allow tests to run
          // For actual crypto tests, we should use a proper crypto library
          return new Uint8Array(32); // 32 bytes = 256 bits
        },
        // Add other crypto methods as needed
      },
      getRandomValues: (array: Uint8Array) => {
        // Fill with deterministic "random" values for testing
        for (let i = 0; i < array.length; i++) {
          array[i] = i % 256;
        }
        return array;
      }
    } as any;
  }
  
  // Add window.location utilities for testing
  if (typeof window !== 'undefined' && !window.location.__mocked) {
    // Add a way to track if location was modified for cleanup
    Object.defineProperty(window.location, '__mocked', { value: false, writable: true });
  }
});

// Setup before each test
beforeEach(() => {
  // Reset environment variables to known state if needed
  process.env = { ...originalEnv };
  
  // Set up any test-specific globals or mocks
  // ...
});

// Global teardown
afterAll(() => {
  // Restore original environment
  process.env = originalEnv;
  
  // Clean up any global mocks
  // ...
});

// Add custom test utilities to global scope
global.__testUtils = {
  // Mock window.location.href for tests that need to check URL manipulation
  mockLocationHref: (href: string) => {
    const originalHref = window.location.href;
    const originalLocation = window.location;
    
    // Create a new URL object with the desired href
    const url = new URL(href);
    
    // Replace window.location with a mock
    Object.defineProperty(window, 'location', {
      value: url,
      writable: true,
      configurable: true
    });
    
    // Mark as mocked for cleanup
    window.location.__mocked = true;
    
    // Return restore function
    return () => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true
      });
      window.location.__mocked = false;
    };
  },
  
  // Add more test utilities as needed
  // ...
};
