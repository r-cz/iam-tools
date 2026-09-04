import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useLocalStorage } from '@/hooks/use-local-storage'

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('useLocalStorage', () => {
  test('reads persisted state and applies sequential functional updates', () => {
    window.localStorage.setItem('count', '2')
    const { result } = renderHook(() => useLocalStorage('count', 0))
    expect(result.current[0]).toBe(2)
    act(() => {
      result.current[1]((value) => value + 1)
      result.current[1]((value) => value + 1)
    })
    expect(result.current[0]).toBe(4)
    expect(window.localStorage.getItem('count')).toBe('4')
  })

  test('sanitizes both initial data and external storage updates', () => {
    const sanitize = (value: unknown) => (typeof value === 'number' ? value : 0)
    window.localStorage.setItem('count', 'null')
    const { result } = renderHook(() => useLocalStorage('count', 0, sanitize))
    expect(result.current[0]).toBe(0)
    act(() =>
      window.dispatchEvent(
        new window.StorageEvent('storage', {
          key: 'count',
          newValue: '3',
          storageArea: window.localStorage,
        })
      )
    )
    expect(result.current[0]).toBe(3)
    act(() =>
      window.dispatchEvent(
        new window.StorageEvent('storage', {
          key: 'count',
          newValue: '[]',
          storageArea: window.localStorage,
        })
      )
    )
    expect(result.current[0]).toBe(0)
  })

  test('resets state when another tab clears localStorage', () => {
    window.localStorage.setItem('count', '5')
    const { result } = renderHook(() => useLocalStorage('count', 0))
    act(() =>
      window.dispatchEvent(
        new window.StorageEvent('storage', {
          key: null,
          newValue: null,
          storageArea: window.localStorage,
        })
      )
    )
    expect(result.current[0]).toBe(0)
    act(() => result.current[1]((value) => value + 1))
    expect(result.current[0]).toBe(1)
  })

  test('ignores sessionStorage and unrelated localStorage events', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0))
    act(() => {
      window.dispatchEvent(
        new window.StorageEvent('storage', {
          key: 'count',
          newValue: '9',
          storageArea: window.sessionStorage,
        })
      )
      window.dispatchEvent(
        new window.StorageEvent('storage', {
          key: 'other',
          newValue: '9',
          storageArea: window.localStorage,
        })
      )
    })
    expect(result.current[0]).toBe(0)
  })
})
