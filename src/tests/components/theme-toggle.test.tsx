import { afterEach, describe, expect, test } from 'bun:test'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { ThemeMeta } from '@/components/theme/theme-meta'
import { ThemeProvider, useTheme } from '@/components/theme/theme-provider'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  document.documentElement.className = ''
  document.querySelector('meta[name="theme-color"]')?.remove()
})

describe('ThemeProvider', () => {
  test('validates storage and owns system-theme changes for every consumer', async () => {
    let matches = true
    const listeners = new Set<() => void>()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        get matches() {
          return matches
        },
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => true,
      }),
    })
    window.localStorage.setItem('test-theme', 'invalid')
    document.head.insertAdjacentHTML('beforeend', '<meta name="theme-color" content="#1a1a1a">')

    const view = render(
      <ThemeProvider defaultTheme="system" storageKey="test-theme">
        <ThemeMeta />
        <ThemeProbe />
      </ThemeProvider>
    )

    await waitFor(() => expect(view.getByTestId('resolved-theme').textContent).toBe('system:dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#0a0a0a'
    )

    matches = false
    act(() => listeners.forEach((listener) => listener()))
    await waitFor(() => expect(view.getByTestId('resolved-theme').textContent).toBe('system:light'))
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark-mode')).toBe(false)
  })
})

function ThemeProbe() {
  const { theme, resolvedTheme } = useTheme()
  return <span data-testid="resolved-theme">{`${theme}:${resolvedTheme}`}</span>
}
