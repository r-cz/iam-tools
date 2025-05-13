import { Window } from 'happy-dom';
import { vi } from 'vitest';

/**
 * Sets up a simple DOM environment for testing with Happy DOM.
 * This should be imported before using React Testing Library.
 */
export function setupTestingDOM() {
  // Create window and document
  const window = new Window({
    url: 'http://localhost:3000',
    width: 1024,
    height: 768
  });

  // Set up DOM globals
  global.window = window;
  global.document = window.document;
  
  // Define navigator with mocks for clipboard
  Object.defineProperty(global, 'navigator', {
    value: {
      ...window.navigator,
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
        readText: vi.fn(() => Promise.resolve('mocked-clipboard-text')),
        read: vi.fn(),
        write: vi.fn()
      }
    },
    writable: true
  });
  
  global.HTMLElement = window.HTMLElement;
  global.Element = window.Element;
  global.NodeList = window.NodeList;
  
  // Mock requestAnimationFrame and cancelAnimationFrame
  global.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  
  // Add missing DOM properties
  global.getComputedStyle = window.getComputedStyle.bind(window);
  
  // Mock URL
  if (!global.URL.createObjectURL) {
    Object.defineProperty(global.URL, 'createObjectURL', { value: vi.fn(() => 'mock-url') });
  }
  if (!global.URL.revokeObjectURL) {
    Object.defineProperty(global.URL, 'revokeObjectURL', { value: vi.fn() });
  }
  
  // Mock LocalStorage
  global.localStorage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(() => null),
    length: 0
  };

  // Mock fetch if not available
  if (!global.fetch) {
    global.fetch = vi.fn();
  }
  
  // Return window and cleanup function
  return {
    window,
    cleanup: () => {
      // Clean up any global mocks here
    }
  };
}

// Setup DOM by default when this module is imported
setupTestingDOM();