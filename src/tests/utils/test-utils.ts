import { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Re-export testing utilities
export { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach };

// Helper to render components with standard providers if needed
export function renderWithProviders(ui: React.ReactElement) {
  return render(ui);
}

// Add more helper functions as needed for testing
