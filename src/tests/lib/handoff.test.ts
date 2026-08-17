import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  clearHandoffs,
  consumeHandoff,
  createHandoff,
  getHandoffIdFromNavigationState,
  HANDOFF_TTL_MS,
  initializeHandoffCleanup,
  TOKEN_COMPARISON_DESTINATION,
  TOKEN_INSPECTOR_DESTINATION,
} from '@/lib/handoff'

const TEST_TOKEN = 'header.payload.signature'

function getOnlySessionStorageKey(): string {
  expect(window.sessionStorage.length).toBe(1)
  const key = window.sessionStorage.key(0)
  expect(key).not.toBeNull()
  return key!
}

describe('one-time token handoffs', () => {
  beforeEach(() => {
    clearHandoffs()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  afterEach(() => {
    clearHandoffs()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  test('stores the payload in session storage and consumes it only once', () => {
    const state = createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: TEST_TOKEN })

    expect(state).not.toBeNull()
    expect(JSON.stringify(state)).not.toContain(TEST_TOKEN)
    expect(window.localStorage.length).toBe(0)

    expect(consumeHandoff(state!.handoffId, TOKEN_INSPECTOR_DESTINATION)).toEqual({
      token: TEST_TOKEN,
    })
    expect(window.sessionStorage.length).toBe(0)
    expect(consumeHandoff(state!.handoffId, TOKEN_INSPECTOR_DESTINATION)).toBeNull()
  })

  test('rejects and removes expired handoffs', () => {
    const state = createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: TEST_TOKEN })
    const key = getOnlySessionStorageKey()
    const handoff = JSON.parse(window.sessionStorage.getItem(key)!)
    handoff.createdAt = Date.now() - HANDOFF_TTL_MS - 1
    window.sessionStorage.setItem(key, JSON.stringify(handoff))

    expect(consumeHandoff(state!.handoffId, TOKEN_INSPECTOR_DESTINATION)).toBeNull()
    expect(window.sessionStorage.length).toBe(0)
  })

  test('rejects invalid JSON without throwing and removes it', () => {
    const state = createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: TEST_TOKEN })
    const key = getOnlySessionStorageKey()
    window.sessionStorage.setItem(key, '{not-json')

    expect(consumeHandoff(state!.handoffId, TOKEN_INSPECTOR_DESTINATION)).toBeNull()
    expect(window.sessionStorage.length).toBe(0)
  })

  test('fails closed when the one-time entry cannot be deleted', () => {
    const state = createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: TEST_TOKEN })
    const originalRemoveItem = window.sessionStorage.removeItem.bind(window.sessionStorage)

    Object.defineProperty(window.sessionStorage, 'removeItem', {
      configurable: true,
      value: (key: string) => {
        if (key.startsWith('iam-tools:handoff:')) {
          throw new Error('storage removal blocked')
        }
        return originalRemoveItem(key)
      },
    })

    try {
      expect(consumeHandoff(state!.handoffId, TOKEN_INSPECTOR_DESTINATION)).toBeNull()
      expect(window.sessionStorage.length).toBe(1)
    } finally {
      Object.defineProperty(window.sessionStorage, 'removeItem', {
        configurable: true,
        value: originalRemoveItem,
      })
    }

    expect(consumeHandoff(state!.handoffId, TOKEN_INSPECTOR_DESTINATION)).toEqual({
      token: TEST_TOKEN,
    })
    expect(window.sessionStorage.length).toBe(0)
  })

  test('purges an expired entry during startup recovery without a create or consume', () => {
    createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: TEST_TOKEN })
    const key = getOnlySessionStorageKey()
    const handoff = JSON.parse(window.sessionStorage.getItem(key)!)
    handoff.createdAt = Date.now() - HANDOFF_TTL_MS - 1
    window.sessionStorage.setItem(key, JSON.stringify(handoff))

    initializeHandoffCleanup()

    expect(window.sessionStorage.getItem(key)).toBeNull()
  })

  test('reschedules physical expiry for a surviving entry during startup recovery', async () => {
    createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: TEST_TOKEN })
    const key = getOnlySessionStorageKey()
    const handoff = JSON.parse(window.sessionStorage.getItem(key)!)
    handoff.createdAt = Date.now() + 25 - HANDOFF_TTL_MS
    window.sessionStorage.setItem(key, JSON.stringify(handoff))

    initializeHandoffCleanup()
    await new Promise((resolve) => window.setTimeout(resolve, 50))

    expect(window.sessionStorage.getItem(key)).toBeNull()
  })

  test('purges expired prefixed entries before creating a new handoff', () => {
    createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: 'expired.token.value' })
    const expiredKey = getOnlySessionStorageKey()
    const expiredHandoff = JSON.parse(window.sessionStorage.getItem(expiredKey)!)
    expiredHandoff.createdAt = Date.now() - HANDOFF_TTL_MS - 1
    window.sessionStorage.setItem(expiredKey, JSON.stringify(expiredHandoff))

    const current = createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: TEST_TOKEN })

    expect(current).not.toBeNull()
    expect(window.sessionStorage.length).toBe(1)
    expect(window.sessionStorage.getItem(expiredKey)).toBeNull()
  })

  test('clears every active one-time handoff without touching unrelated session data', () => {
    createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: TEST_TOKEN })
    createHandoff(TOKEN_COMPARISON_DESTINATION, {
      leftToken: TEST_TOKEN,
      rightToken: 'other.token.value',
    })
    window.sessionStorage.setItem('unrelated-session-key', 'keep')

    clearHandoffs()

    expect(window.sessionStorage.length).toBe(1)
    expect(window.sessionStorage.getItem('unrelated-session-key')).toBe('keep')
  })

  test('binds each handoff to its allowlisted destination', () => {
    const state = createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: TEST_TOKEN })

    expect(consumeHandoff(state!.handoffId, TOKEN_COMPARISON_DESTINATION)).toBeNull()
    expect(window.sessionStorage.length).toBe(0)
    expect(consumeHandoff(state!.handoffId, TOKEN_INSPECTOR_DESTINATION)).toBeNull()
  })

  test('consumes a valid version 1 handoff during migration', () => {
    const state = createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: TEST_TOKEN })
    const key = getOnlySessionStorageKey()
    const handoff = JSON.parse(window.sessionStorage.getItem(key)!)
    handoff.version = 1
    handoff.expiresAt = handoff.createdAt + HANDOFF_TTL_MS
    window.sessionStorage.setItem(key, JSON.stringify(handoff))

    expect(consumeHandoff(state!.handoffId, TOKEN_INSPECTOR_DESTINATION)).toEqual({
      token: TEST_TOKEN,
    })
  })

  test('accepts only opaque handoff IDs from router state', () => {
    expect(getHandoffIdFromNavigationState(null)).toBeNull()
    expect(getHandoffIdFromNavigationState({ handoffId: TEST_TOKEN })).toBeNull()
    expect(getHandoffIdFromNavigationState({ handoffId: '../token' })).toBeNull()

    const state = createHandoff(TOKEN_INSPECTOR_DESTINATION, { token: TEST_TOKEN })
    expect(getHandoffIdFromNavigationState(state)).toBe(state!.handoffId)
  })
})
