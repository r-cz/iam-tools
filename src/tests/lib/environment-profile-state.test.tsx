import React from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { AppStateProvider, useEnvironmentProfiles } from '@/lib/state'
import { STORAGE_KEYS } from '@/lib/state/constants'
import { findButtonByName } from '../utils/test-utils'

function EnvironmentProfilesHarness() {
  const { profiles, saveProfile, updateProfile, markProfileUsed, removeProfile } =
    useEnvironmentProfiles()

  return (
    <div>
      <button
        type="button"
        data-testid="save-alpha"
        onClick={() =>
          saveProfile({
            name: 'Alpha',
            issuerUrl: 'https://alpha.example.com',
            authorizationEndpoint: 'https://alpha.example.com/oauth2/authorize',
            tokenEndpoint: 'https://alpha.example.com/oauth2/token',
            scopes: ['openid'],
          })
        }
      >
        Save Alpha
      </button>
      <button
        type="button"
        data-testid="save-beta"
        onClick={() =>
          saveProfile({
            name: 'Beta',
            issuerUrl: 'https://beta.example.com',
            jwksEndpoint: 'https://beta.example.com/jwks',
            scopes: ['profile'],
          })
        }
      >
        Save Beta
      </button>
      <button
        type="button"
        data-testid="update-alpha"
        onClick={() => {
          const alphaProfile = profiles.find(
            (profile) => profile.name === 'Alpha' || profile.name === 'Alpha Updated'
          )
          if (!alphaProfile) {
            return
          }

          updateProfile(alphaProfile.id, {
            name: 'Alpha Updated',
            clientId: 'alpha-client',
          })
        }}
      >
        Update Alpha
      </button>
      <button
        type="button"
        data-testid="mark-alpha-used"
        onClick={() => {
          const alphaProfile = profiles.find((profile) => profile.name.startsWith('Alpha'))
          if (!alphaProfile) {
            return
          }

          markProfileUsed(alphaProfile.id)
        }}
      >
        Mark Alpha Used
      </button>
      <button
        type="button"
        data-testid="remove-beta"
        onClick={() => {
          const betaProfile = profiles.find((profile) => profile.name === 'Beta')
          if (!betaProfile) {
            return
          }

          removeProfile(betaProfile.id)
        }}
      >
        Remove Beta
      </button>
      <pre data-testid="profiles">{JSON.stringify(profiles)}</pre>
    </div>
  )
}

describe('environment profile state', () => {
  const originalDateNow = Date.now
  let nowValue = 1_000

  beforeEach(() => {
    cleanup()
    window.localStorage.clear()
    nowValue = 1_000
    Date.now = () => {
      nowValue += 1
      return nowValue
    }
  })

  afterEach(() => {
    Date.now = originalDateNow
    cleanup()
    window.localStorage.clear()
  })

  test('supports CRUD, ordering, and localStorage persistence', async () => {
    const view = render(
      <AppStateProvider>
        <EnvironmentProfilesHarness />
      </AppStateProvider>
    )

    const readProfiles = () =>
      JSON.parse(view.container.getElementsByTagName('pre').item(0)?.textContent || '[]')

    fireEvent.click(findButtonByName('Save Alpha', view.container)!)
    fireEvent.click(findButtonByName('Save Beta', view.container)!)

    await waitFor(() => {
      const profiles = readProfiles()
      expect(profiles.map((profile: { name: string }) => profile.name)).toEqual(['Beta', 'Alpha'])
    })

    fireEvent.click(findButtonByName('Update Alpha', view.container)!)

    await waitFor(() => {
      const profiles = readProfiles()
      const alphaProfile = profiles.find((profile: { name: string }) =>
        profile.name.startsWith('Alpha')
      )

      expect(alphaProfile.name).toBe('Alpha Updated')
      expect(alphaProfile.clientId).toBe('alpha-client')
    })

    fireEvent.click(findButtonByName('Mark Alpha Used', view.container)!)

    await waitFor(() => {
      const profiles = readProfiles()
      expect(profiles[0].name).toBe('Alpha Updated')
      expect(profiles[0].lastUsedAt).toBeGreaterThan(profiles[1].lastUsedAt)
    })

    const storedProfiles = JSON.parse(
      window.localStorage.getItem(STORAGE_KEYS.ENVIRONMENT_PROFILES) || '[]'
    )
    expect(storedProfiles).toHaveLength(2)
    expect(storedProfiles[0].name).toBe('Alpha Updated')

    fireEvent.click(findButtonByName('Remove Beta', view.container)!)

    await waitFor(() => {
      const profiles = readProfiles()
      expect(profiles).toHaveLength(1)
      expect(profiles[0].name).toBe('Alpha Updated')
    })
  })

  test('bootstraps safely from existing localStorage data', async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.ENVIRONMENT_PROFILES,
      JSON.stringify([
        {
          id: 'existing-profile',
          name: 'Existing Environment',
          issuerUrl: 'https://issuer.example.com',
          scopes: ['openid', 'email'],
          createdAt: 100,
          updatedAt: 200,
          lastUsedAt: 300,
        },
      ])
    )

    render(
      <AppStateProvider>
        <EnvironmentProfilesHarness />
      </AppStateProvider>
    )

    await waitFor(() => {
      const profiles = JSON.parse(document.getElementsByTagName('pre').item(0)?.textContent || '[]')
      expect(profiles).toHaveLength(1)
      expect(profiles[0].name).toBe('Existing Environment')
      expect(profiles[0].issuerUrl).toBe('https://issuer.example.com')
    })
  })
})
