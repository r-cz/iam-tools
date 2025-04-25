import '@testing-library/jest-dom/extend-expect';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);
// This file sets up the test environment
import { afterAll, afterEach, beforeAll, expect } from 'bun:test';

// Clean up after each test
afterEach(() => {
  // Add any cleanup logic here
});

// Global setup
beforeAll(() => {
  // Add any global test setup here
});

// Global teardown
afterAll(() => {
  // Add any global test teardown here
});
