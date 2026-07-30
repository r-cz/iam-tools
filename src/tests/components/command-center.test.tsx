import * as React from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'

import { CommandCenterProvider, CommandCenterTrigger } from '@/components/command-center'
import { STORAGE_KEYS } from '@/lib/state/constants'
import { ToolPreferencesProvider } from '@/lib/state/tool-preferences-context'
import { searchToolCommands } from '@/lib/tool-search'

Object.assign(window, { TypeError: globalThis.TypeError })
Object.assign(globalThis, {
  CustomEvent: window.CustomEvent,
  Event: window.Event,
  KeyboardEvent: window.KeyboardEvent,
  MouseEvent: window.MouseEvent,
  MutationObserver: window.MutationObserver,
})

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderCommandCenter() {
  return render(
    <MemoryRouter>
      <ToolPreferencesProvider>
        <CommandCenterProvider>
          <CommandCenterTrigger />
          <LocationProbe />
        </CommandCenterProvider>
      </ToolPreferencesProvider>
    </MemoryRouter>
  )
}

describe('CommandCenter', () => {
  beforeEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  test('opens with the platform shortcut and ignores repeats and IME composition', async () => {
    renderCommandCenter()

    fireEvent.keyDown(window, { key: 'k', metaKey: true, repeat: true })
    expect(screen.queryByTestId('command-center')).toBeNull()

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true, isComposing: true })
    expect(screen.queryByTestId('command-center')).toBeNull()

    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByTestId('command-center')).not.toBeNull()
    const searchInput = screen.getByRole('combobox', {
      name: 'Search tools and workflows',
    })
    await waitFor(() => expect(document.activeElement).toBe(searchInput))

    fireEvent.change(searchInput, { target: { value: 'token' } })
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.queryByTestId('command-center')).toBeNull()

    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    const reopenedSearchInput = screen.getByRole('combobox', {
      name: 'Search tools and workflows',
    }) as HTMLInputElement
    expect(reopenedSearchInput.value).toBe('')
  })

  test('searches catalog metadata, supports arrow navigation, and opens the selected route', () => {
    renderCommandCenter()
    fireEvent.click(screen.getByRole('button', { name: 'Search tools' }))

    const searchInput = screen.getByRole('combobox', {
      name: 'Search tools and workflows',
    })
    const results = searchToolCommands('token')
    expect(results.length).toBeGreaterThan(1)

    fireEvent.change(searchInput, { target: { value: 'token' } })
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' })
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    expect(screen.getByTestId('location').textContent).toBe(results[1].tool.path)
    expect(screen.queryByTestId('command-center')).toBeNull()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.RECENT_TOOLS) ?? '[]')[0]).toEqual({
      id: results[1].tool.id,
      visitedAt: expect.any(Number),
    })
  })

  test('uses a non-composite empty state for its recovery action', () => {
    renderCommandCenter()
    fireEvent.click(screen.getByRole('button', { name: 'Search tools' }))

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Search tools and workflows',
      }),
      { target: { value: 'definitely-not-a-catalog-tool' } }
    )

    expect(screen.queryByRole('grid', { name: 'Tools' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Browse all tools' }))
    expect(screen.getByRole('grid', { name: 'Tools' })).not.toBeNull()
  })

  test('toggles favorites from a result star and with Shift+Enter', () => {
    renderCommandCenter()
    fireEvent.click(screen.getByRole('button', { name: 'Search tools' }))

    const searchInput = screen.getByRole('combobox', {
      name: 'Search tools and workflows',
    })
    fireEvent.change(searchInput, { target: { value: 'Token Inspector' } })
    const toolGrid = screen.getByRole('grid', { name: 'Tools' })
    const resultFavoriteButton = within(toolGrid).getByRole('button', {
      name: 'Add Token Inspector to favorites',
    })

    expect(resultFavoriteButton.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(resultFavoriteButton)

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.FAVORITE_TOOL_IDS) ?? '[]')).toEqual(
      ['token-inspector']
    )
    expect(
      within(toolGrid).getByRole('button', {
        name: 'Remove Token Inspector from favorites',
      })
    ).not.toBeNull()

    fireEvent.keyDown(searchInput, { key: 'Enter', shiftKey: true })
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.FAVORITE_TOOL_IDS) ?? '[]')).toEqual(
      []
    )
    expect(screen.getByTestId('command-center')).not.toBeNull()
    expect(screen.getByTestId('location').textContent).toBe('/')
  })

  test('restores trigger focus on Escape', async () => {
    renderCommandCenter()
    const trigger = screen.getByRole('button', { name: 'Search tools' })

    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.keyDown(
      screen.getByRole('combobox', {
        name: 'Search tools and workflows',
      }),
      { key: 'Escape' }
    )

    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
