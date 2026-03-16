import { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test'
import { vi } from 'vitest'
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import { AppStateProvider } from '@/lib/state'

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
  return render(
    React.createElement(AppStateProvider, null, React.createElement(BrowserRouter, null, ui))
  )
}

function iterateElements(root: Document | Element = document): HTMLElement[] {
  return Array.from(root.getElementsByTagName('*')) as HTMLElement[]
}

export function findButtonByName(
  name: string,
  root: Document | Element = document
): HTMLButtonElement | null {
  return (
    Array.from(root.getElementsByTagName('button')).find((button) => {
      const text = button.textContent?.trim() ?? ''
      const ariaLabel = button.getAttribute('aria-label') ?? ''
      const title = button.getAttribute('title') ?? ''

      return text === name || text.includes(name) || ariaLabel === name || title === name
    }) ?? null
  )
}

export function findButtonsByName(
  name: string,
  root: Document | Element = document
): HTMLButtonElement[] {
  return Array.from(root.getElementsByTagName('button')).filter((button) => {
    const text = button.textContent?.trim() ?? ''
    const ariaLabel = button.getAttribute('aria-label') ?? ''
    const title = button.getAttribute('title') ?? ''

    return text === name || text.includes(name) || ariaLabel === name || title === name
  })
}

export function findElementsByRole(
  role: string,
  root: Document | Element = document
): HTMLElement[] {
  return iterateElements(root).filter((element) => element.getAttribute('role') === role)
}

export function findElementByText(
  text: string,
  root: Document | Element = document
): HTMLElement | null {
  return (
    iterateElements(root).find((element) => {
      const value = element.textContent?.trim()
      return value === text || value?.includes(text)
    }) ?? null
  )
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

// Use RTL's waitFor so pending React updates are flushed via act() in CI as well as locally.
export async function waitForCondition(condition: () => boolean, timeout = 3000) {
  try {
    await waitFor(
      () => {
        let matches = false

        try {
          matches = condition()
        } catch {
          matches = false
        }

        expect(matches).toBe(true)
      },
      { timeout, interval: 50 }
    )

    return true
  } catch {
    return false
  }
}
