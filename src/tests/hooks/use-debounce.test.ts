import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/use-debounce'

describe('useDebounce', () => {
  beforeEach(() => {
    // Use fake timers for precise control
    // Bun test doesn't have jest.useFakeTimers, so we'll use real timers with waitFor
  })

  afterEach(() => {
    // Clean up
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))

    expect(result.current).toBe('initial')
  })

  it('should debounce value updates', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'first', delay: 100 },
    })

    expect(result.current).toBe('first')

    // Update value
    rerender({ value: 'second', delay: 100 })

    // Immediately after update, should still be old value
    expect(result.current).toBe('first')

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(result.current).toBe('second')
  })

  it('should reset timer on rapid updates', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 100 },
    })

    // Rapid updates
    rerender({ value: 'b', delay: 100 })
    await new Promise((resolve) => setTimeout(resolve, 50))
    rerender({ value: 'c', delay: 100 })
    await new Promise((resolve) => setTimeout(resolve, 50))
    rerender({ value: 'd', delay: 100 })

    // Should still be 'a' since we keep resetting
    expect(result.current).toBe('a')

    // Wait for final debounce
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Should be the last value
    expect(result.current).toBe('d')
  })

  it('should use default delay of 500ms', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'updated' })

    // After 300ms, should still be initial
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(result.current).toBe('initial')

    // After 550ms total, should be updated
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(result.current).toBe('updated')
  })

  it('should handle different types of values', async () => {
    // Number
    const { result: numResult, rerender: numRerender } = renderHook(
      ({ value }) => useDebounce(value, 50),
      { initialProps: { value: 0 } }
    )

    numRerender({ value: 42 })
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(numResult.current).toBe(42)

    // Object
    const obj1 = { name: 'test' }
    const obj2 = { name: 'updated' }
    const { result: objResult, rerender: objRerender } = renderHook(
      ({ value }) => useDebounce(value, 50),
      { initialProps: { value: obj1 } }
    )

    objRerender({ value: obj2 })
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(objResult.current).toEqual({ name: 'updated' })

    // Array
    const arr1 = [1, 2, 3]
    const arr2 = [4, 5, 6]
    const { result: arrResult, rerender: arrRerender } = renderHook(
      ({ value }) => useDebounce(value, 50),
      { initialProps: { value: arr1 } }
    )

    arrRerender({ value: arr2 })
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(arrResult.current).toEqual([4, 5, 6])
  })

  it('should handle boolean values', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 50), {
      initialProps: { value: false },
    })

    expect(result.current).toBe(false)

    rerender({ value: true })
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(result.current).toBe(true)
  })

  it('should handle null and undefined', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce<string | null | undefined>(value, 50),
      { initialProps: { value: 'test' as string | null | undefined } }
    )

    rerender({ value: null })
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(result.current).toBeNull()

    rerender({ value: undefined })
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(result.current).toBeUndefined()
  })

  it('should handle delay changes', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 100 },
    })

    // Change both value and delay
    rerender({ value: 'updated', delay: 50 })

    // Wait for the new shorter delay
    await new Promise((resolve) => setTimeout(resolve, 75))

    expect(result.current).toBe('updated')
  })

  it('should handle zero delay', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 0), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'updated' })

    // Even with 0 delay, it still needs to go through useEffect
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(result.current).toBe('updated')
  })

  it('should preserve reference equality for unchanged values', () => {
    const value = { id: 1, name: 'test' }

    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 100), {
      initialProps: { val: value },
    })

    // Same reference passed
    rerender({ val: value })

    // Should maintain same reference
    expect(result.current).toBe(value)
  })

  it('should clean up timeout on unmount', async () => {
    const { result, rerender, unmount } = renderHook(({ value }) => useDebounce(value, 200), {
      initialProps: { value: 'initial' },
    })

    rerender({ value: 'updated' })

    // Unmount before timeout fires
    unmount()

    // Wait past the debounce time
    await new Promise((resolve) => setTimeout(resolve, 250))

    // No error should occur (timeout was cleaned up)
    expect(result.current).toBe('initial')
  })
})
