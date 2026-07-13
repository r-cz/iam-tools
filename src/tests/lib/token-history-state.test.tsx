import React from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { AppStateProvider, useSettings, useTokenHistory } from '@/lib/state'
import { STORAGE_KEYS } from '@/lib/state/constants'

const TEST_TOKEN = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJsb2NhbC10ZXN0LXVzZXIifQ.'

function TokenHistoryHarness() {
  const { tokenHistory, addToken } = useTokenHistory()
  const { settings, updateSettings } = useSettings()

  return (
    <div>
      <button type="button" onClick={() => addToken(TEST_TOKEN)}>
        Add token
      </button>
      <button type="button" onClick={() => updateSettings({ persistTokenHistory: true })}>
        Enable history
      </button>
      <output data-testid="history-enabled">
        {settings.persistTokenHistory === true ? 'enabled' : 'disabled'}
      </output>
      <output data-testid="token-count">{tokenHistory.length}</output>
    </div>
  )
}

describe('token history privacy setting', () => {
  beforeEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  test('does not persist raw tokens until history is explicitly enabled', async () => {
    const view = render(
      <AppStateProvider>
        <TokenHistoryHarness />
      </AppStateProvider>
    )

    const buttons = view.container.getElementsByTagName('button')
    fireEvent.click(buttons[0])

    await waitFor(() => {
      expect(view.getByTestId('token-count').textContent).toBe('0')
      expect(window.localStorage.getItem(STORAGE_KEYS.TOKEN_HISTORY)).toBeNull()
    })

    fireEvent.click(buttons[1])
    await waitFor(() => {
      expect(view.getByTestId('history-enabled').textContent).toBe('enabled')
    })

    fireEvent.click(buttons[0])
    await waitFor(() => {
      expect(view.getByTestId('token-count').textContent).toBe('1')
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.TOKEN_HISTORY) || '[]')
      expect(stored[0].token).toBe(TEST_TOKEN)
    })
  })

  test('treats legacy settings without the privacy flag as disabled', async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.USER_SETTINGS,
      JSON.stringify({
        maxHistoryItems: 10,
        tokenDisplayFormat: 'decoded',
        enableDetailedValidation: true,
        defaultTab: 'payload',
      })
    )

    const view = render(
      <AppStateProvider>
        <TokenHistoryHarness />
      </AppStateProvider>
    )

    fireEvent.click(view.container.getElementsByTagName('button')[0])

    await waitFor(() => {
      expect(view.getByTestId('history-enabled').textContent).toBe('disabled')
      expect(view.getByTestId('token-count').textContent).toBe('0')
    })
  })
})
