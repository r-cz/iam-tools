import * as React from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { STORAGE_KEYS } from '@/lib/state/constants'
import {
  MAX_RECENT_TOOLS,
  sanitizeFavoriteToolIds,
  sanitizeRecentToolRecords,
  ToolPreferencesProvider,
  useToolPreferences,
} from '@/lib/state/tool-preferences-context'

function PreferencesHarness() {
  const { favoriteToolIds, recentTools, toggleFavorite, recordRecent, clearToolPreferences } =
    useToolPreferences()

  return (
    <>
      <output data-testid="favorites">{favoriteToolIds.join(',')}</output>
      <output data-testid="recents">
        {recentTools.map(({ id, visitedAt }) => `${id}:${visitedAt}`).join(',')}
      </output>
      <button type="button" onClick={() => toggleFavorite('token-inspector')}>
        Toggle favorite
      </button>
      <button type="button" onClick={() => recordRecent('token-inspector', 1_234)}>
        Record recent
      </button>
      <button type="button" onClick={clearToolPreferences}>
        Clear preferences
      </button>
    </>
  )
}

describe('tool preferences state', () => {
  beforeEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  test('sanitizes stale, duplicate, and malformed preference records', () => {
    expect(
      sanitizeFavoriteToolIds(['token-inspector', 'token-inspector', 'removed-tool', null])
    ).toEqual(['token-inspector'])

    const records = sanitizeRecentToolRecords([
      { id: 'token-inspector', visitedAt: 10 },
      { id: 'token-inspector', visitedAt: 20 },
      { id: 'token-comparison', visitedAt: 19 },
      { id: 'oidc-explorer', visitedAt: 18 },
      { id: 'redirect-uri-debugger', visitedAt: 17 },
      { id: 'oauth-playground', visitedAt: 16 },
      { id: 'oauth-auth-code', visitedAt: 15 },
      { id: 'oauth-client-credentials', visitedAt: 14 },
      { id: 'removed-tool', visitedAt: 100 },
      { id: 'totp-debugger', visitedAt: Number.NaN },
    ])

    expect(records).toHaveLength(MAX_RECENT_TOOLS)
    expect(records[0]).toEqual({ id: 'token-inspector', visitedAt: 20 })
    expect(records.map(({ id }) => id)).not.toContain('removed-tool')
  })

  test('bootstraps safely from incompatible existing storage values', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.FAVORITE_TOOL_IDS,
      JSON.stringify({ favorite: 'token-inspector' })
    )
    window.localStorage.setItem(STORAGE_KEYS.RECENT_TOOLS, JSON.stringify('legacy-value'))

    render(
      <ToolPreferencesProvider>
        <PreferencesHarness />
      </ToolPreferencesProvider>
    )

    expect(screen.getByTestId('favorites').textContent).toBe('')
    expect(screen.getByTestId('recents').textContent).toBe('')
  })

  test('persists only tool IDs and visit timestamps and clears both stores', () => {
    render(
      <ToolPreferencesProvider>
        <PreferencesHarness />
      </ToolPreferencesProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Toggle favorite' }))
    fireEvent.click(screen.getByRole('button', { name: 'Record recent' }))

    expect(
      JSON.parse(window.localStorage.getItem(STORAGE_KEYS.FAVORITE_TOOL_IDS) ?? 'null')
    ).toEqual(['token-inspector'])
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.RECENT_TOOLS) ?? 'null')).toEqual([
      { id: 'token-inspector', visitedAt: 1_234 },
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Clear preferences' }))

    expect(
      JSON.parse(window.localStorage.getItem(STORAGE_KEYS.FAVORITE_TOOL_IDS) ?? 'null')
    ).toEqual([])
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.RECENT_TOOLS) ?? 'null')).toEqual([])
  })
})
