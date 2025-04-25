import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme/theme-provider'; // Use alias

// Define a wrapper component that includes the ThemeProvider
const AllTheProviders: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // You might need to adjust defaultTheme and storageKey based on your actual ThemeProvider setup
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      {children}
    </ThemeProvider>
  );
};

// Custom render function that includes the providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override the default render method with our custom one
export { customRender as render };

// Add more helper functions as needed for testing
