import * as React from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { CommandCenterProvider } from '@/components/command-center'
import { QuickAccess } from '@/features/home/quick-access'
import { STORAGE_KEYS } from '@/lib/state/constants'
import { ToolPreferencesProvider } from '@/lib/state/tool-preferences-context'

describe('QuickAccess', () => {
  const originalDateNow = Date.now
  const originalSetInterval = window.setInterval
  const originalClearInterval = window.clearInterval

  beforeEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    Date.now = originalDateNow
    window.setInterval = originalSetInterval
    window.clearInterval = originalClearInterval
  })

  test('refreshes relative recent times every minute and clears its interval', () => {
    let now = 1_000_000
    let intervalCallback: (() => void) | undefined
    let clearedInterval: number | undefined

    Date.now = () => now
    window.setInterval = ((callback: TimerHandler, delay?: number) => {
      expect(delay).toBe(60_000)
      intervalCallback = callback as () => void
      return 42
    }) as typeof window.setInterval
    window.clearInterval = ((intervalId: number) => {
      clearedInterval = intervalId
    }) as typeof window.clearInterval
    window.localStorage.setItem(
      STORAGE_KEYS.RECENT_TOOLS,
      JSON.stringify([{ id: 'token-inspector', visitedAt: now - 30_000 }])
    )

    const view = render(
      <MemoryRouter>
        <ToolPreferencesProvider>
          <CommandCenterProvider>
            <QuickAccess totalToolCount={1} />
          </CommandCenterProvider>
        </ToolPreferencesProvider>
      </MemoryRouter>
    )

    expect(screen.getByText('Just now')).not.toBeNull()

    now += 90_000
    act(() => intervalCallback?.())
    expect(screen.getByText('2m ago')).not.toBeNull()

    view.unmount()
    expect(clearedInterval).toBe(42)
  })
})
