import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, renderHook } from '@testing-library/react'
import { AppStateProvider, useAppState } from '@/lib/state/app-state-context'
import { STORAGE_KEYS } from '@/lib/state/constants'
import { initialAppState } from '@/lib/state/types'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('persisted app state recovery', () => {
  test('survives incompatible stored values without crashing the app', () => {
    window.localStorage.setItem(STORAGE_KEYS.TOKEN_HISTORY, 'null')
    window.localStorage.setItem(STORAGE_KEYS.ISSUER_HISTORY, '{}')
    window.localStorage.setItem(STORAGE_KEYS.ENVIRONMENT_PROFILES, '[null, 4, {}]')
    window.localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, 'null')
    const { result } = renderHook(() => useAppState(), { wrapper: AppStateProvider })
    expect(result.current.tokenHistory).toEqual([])
    expect(result.current.issuerHistory).toEqual([])
    expect(result.current.environmentProfiles).toEqual([])
    expect(result.current.settings).toEqual(initialAppState.settings)
  })

  test('preserves valid records while removing duplicates and invalid fields', () => {
    const valid = {
      id: 'saved',
      name: 'Saved provider',
      issuerUrl: 'https://issuer.example',
      createdAt: 100,
      updatedAt: 200,
      lastUsedAt: 300,
      scopes: ['openid', 42, 'openid', ' profile '],
      clientSecret: 'must not persist',
      tokenEndpoint: 42,
    }
    window.localStorage.setItem(
      STORAGE_KEYS.ENVIRONMENT_PROFILES,
      JSON.stringify([null, { id: 'bad' }, valid, valid])
    )
    const { result } = renderHook(() => useAppState(), { wrapper: AppStateProvider })
    expect(result.current.environmentProfiles).toHaveLength(1)
    expect(result.current.environmentProfiles[0].scopes).toEqual(['openid', 'profile'])
    expect(result.current.environmentProfiles[0].tokenEndpoint).toBeUndefined()
    expect(result.current.environmentProfiles[0]).not.toHaveProperty('clientSecret')
  })

  test('requires explicit boolean opt-in and restores invalid setting defaults', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.USER_SETTINGS,
      JSON.stringify({
        persistTokenHistory: 'true',
        maxHistoryItems: -1,
        tokenDisplayFormat: 'wrong',
        defaultTab: 42,
        enableDetailedValidation: false,
      })
    )
    const { result } = renderHook(() => useAppState(), { wrapper: AppStateProvider })
    expect(result.current.settings).toEqual({
      ...initialAppState.settings,
      enableDetailedValidation: false,
    })
  })

  test('discards history dates outside the JavaScript Date range', () => {
    const fields = { id: 'invalid-date', createdAt: 100, lastUsedAt: 1e100 }
    window.localStorage.setItem(
      STORAGE_KEYS.ISSUER_HISTORY,
      JSON.stringify([{ ...fields, url: 'https://issuer.example' }])
    )
    window.localStorage.setItem(
      STORAGE_KEYS.TOKEN_HISTORY,
      JSON.stringify([{ ...fields, token: 'some-token' }])
    )
    window.localStorage.setItem(
      STORAGE_KEYS.ENVIRONMENT_PROFILES,
      JSON.stringify([
        {
          ...fields,
          name: 'Test',
          issuerUrl: 'https://issuer.example',
          scopes: [],
          updatedAt: 200,
        },
      ])
    )
    const { result } = renderHook(() => useAppState(), { wrapper: AppStateProvider })
    expect(result.current.tokenHistory).toEqual([])
    expect(result.current.issuerHistory).toEqual([])
    expect(result.current.environmentProfiles).toEqual([])
  })
})
