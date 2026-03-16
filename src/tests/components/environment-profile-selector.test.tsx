import React from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { AppStateProvider } from '@/lib/state'
import { STORAGE_KEYS } from '@/lib/state/constants'
import { EnvironmentProfileSelector } from '@/components/common'
import { findButtonByName, findElementByText, waitForCondition } from '../utils/test-utils'

describe('EnvironmentProfileSelector', () => {
  beforeEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  test('renders profiles ordered by last used time', async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.ENVIRONMENT_PROFILES,
      JSON.stringify([
        {
          id: 'older-profile',
          name: 'Older',
          issuerUrl: 'https://older.example.com',
          scopes: ['openid'],
          createdAt: 10,
          updatedAt: 10,
          lastUsedAt: 10,
        },
        {
          id: 'newer-profile',
          name: 'Newer',
          issuerUrl: 'https://newer.example.com',
          scopes: ['profile'],
          createdAt: 20,
          updatedAt: 20,
          lastUsedAt: 20,
        },
      ])
    )

    const view = render(
      <AppStateProvider>
        <EnvironmentProfileSelector onSelectProfile={() => {}} />
      </AppStateProvider>
    )

    fireEvent.click(findButtonByName('Environments', view.container)!)

    expect(await waitForCondition(() => (document.body.textContent || '').includes('Newer'))).toBe(
      true
    )
    expect(await waitForCondition(() => (document.body.textContent || '').includes('Older'))).toBe(
      true
    )

    const bodyText = document.body.textContent || ''
    expect(bodyText.indexOf('Newer')).toBeLessThan(bodyText.indexOf('Older'))
  })

  test('supports rename and delete flows', async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.ENVIRONMENT_PROFILES,
      JSON.stringify([
        {
          id: 'alpha-profile',
          name: 'Alpha',
          issuerUrl: 'https://alpha.example.com',
          scopes: ['openid'],
          createdAt: 10,
          updatedAt: 10,
          lastUsedAt: 10,
        },
      ])
    )

    const view = render(
      <AppStateProvider>
        <EnvironmentProfileSelector onSelectProfile={() => {}} />
      </AppStateProvider>
    )

    fireEvent.click(findButtonByName('Environments', view.container)!)

    expect(await waitForCondition(() => Boolean(findButtonByName('Edit Alpha')))).toBe(true)
    fireEvent.click(findButtonByName('Edit Alpha')!)

    const nameInput = document.getElementById('environment-profile-name') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Alpha Updated' } })
    fireEvent.click(findButtonByName('Save Changes')!)

    fireEvent.click(findButtonByName('Environments', view.container)!)
    expect(await waitForCondition(() => Boolean(findElementByText('Alpha Updated')))).toBe(true)

    expect(await waitForCondition(() => Boolean(findButtonByName('Delete Alpha Updated')))).toBe(
      true
    )
    fireEvent.click(findButtonByName('Delete Alpha Updated')!)

    expect(await waitForCondition(() => !findButtonByName('Environments', view.container))).toBe(
      true
    )
    const storedProfiles = JSON.parse(
      window.localStorage.getItem(STORAGE_KEYS.ENVIRONMENT_PROFILES) || '[]'
    )
    expect(storedProfiles).toHaveLength(0)
  })
})
