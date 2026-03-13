import React from 'react'
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent } from '@testing-library/react'
import { OidcExplorer } from '@/features/oidcExplorer'
import { STORAGE_KEYS } from '@/lib/state/constants'
import { oidcConfigCache } from '@/lib/cache/oidc-config-cache'
import { jwksCache } from '@/lib/cache/jwks-cache'
import {
  findButtonByName,
  findButtonsByName,
  findElementsByRole,
  renderWithProviders,
  waitForCondition,
} from '../utils/test-utils'
import {
  sampleJwksResponse,
  sampleOidcConfigResponse,
  setupApiMocks,
} from '../utils/test-api-mocks'

const apiMocks = setupApiMocks()

describe('OIDC Explorer saved environments', () => {
  beforeEach(() => {
    cleanup()
    window.localStorage.clear()
    oidcConfigCache.clear()
    jwksCache.clear()
    apiMocks.reset()
    apiMocks
      .mockSuccess('openid-configuration', sampleOidcConfigResponse)
      .mockSuccess('jwks', sampleJwksResponse)
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    oidcConfigCache.clear()
    jwksCache.clear()
    apiMocks.reset()
  })

  afterAll(() => {
    apiMocks.restore()
  })

  test('can save a discovered issuer and load it again from the selector', async () => {
    const firstRender = renderWithProviders(<OidcExplorer />)

    fireEvent.change(document.getElementById('issuer-url') as HTMLInputElement, {
      target: { value: 'example.com' },
    })
    fireEvent.click(findButtonByName('Fetch Config', firstRender.container)!)

    expect(await waitForCondition(() => Boolean(findButtonByName('Save Environment')))).toBe(true)

    fireEvent.click(findButtonByName('Save Environment')!)
    fireEvent.change(document.getElementById('environment-profile-name') as HTMLInputElement, {
      target: { value: 'Example Environment' },
    })
    fireEvent.click(findButtonsByName('Save Environment').at(-1)!)

    const storedProfiles = JSON.parse(
      window.localStorage.getItem(STORAGE_KEYS.ENVIRONMENT_PROFILES) || '[]'
    )
    expect(storedProfiles).toHaveLength(1)
    expect(storedProfiles[0].name).toBe('Example Environment')

    firstRender.unmount()
    oidcConfigCache.clear()
    jwksCache.clear()
    apiMocks.reset()
    apiMocks
      .mockSuccess('openid-configuration', sampleOidcConfigResponse)
      .mockSuccess('jwks', sampleJwksResponse)

    renderWithProviders(<OidcExplorer />)

    fireEvent.click(findButtonByName('Environments')!)
    expect(
      await waitForCondition(() =>
        findElementsByRole('menuitem').some((item) =>
          (item.textContent || '').includes('Example Environment')
        )
      )
    ).toBe(true)
    const profileItem = findElementsByRole('menuitem').find((item) =>
      (item.textContent || '').includes('Example Environment')
    )
    fireEvent.click(profileItem!)

    const issuerInput = document.getElementById('issuer-url') as HTMLInputElement
    expect(await waitForCondition(() => issuerInput.value === 'example.com')).toBe(true)
    expect(await waitForCondition(() => Boolean(findButtonByName('Update Environment')))).toBe(true)
  })
})
