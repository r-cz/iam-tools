import { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test'
import { vi } from 'vitest'
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

// Import DOM setup
import './dom-setup'

// Re-export testing utilities
export { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach }
export { screen, waitFor, fireEvent }

// Re-export mock from vitest
export const mock = vi.fn

// Helper to render components with router context
export function renderWithRouter(ui: React.ReactElement) {
  return render(React.createElement(BrowserRouter, null, ui))
}

// Helper to render components with standard providers if needed
export function renderWithProviders(ui: React.ReactElement) {
  return renderWithRouter(ui)
}

// Mock for console methods
export function mockConsole() {
  const originalConsole = { ...console }

  beforeEach(() => {
    console.log = vi.fn()
    console.error = vi.fn()
    console.warn = vi.fn()
  })

  afterEach(() => {
    console.log = originalConsole.log
    console.error = originalConsole.error
    console.warn = originalConsole.warn
  })
}

// Helper for testing async functions
export async function waitForCondition(condition: () => boolean, timeout = 1000) {
  const startTime = Date.now()
  while (!condition() && Date.now() - startTime < timeout) {
    await new Promise((r) => setTimeout(r, 50))
  }
  return condition()
}
