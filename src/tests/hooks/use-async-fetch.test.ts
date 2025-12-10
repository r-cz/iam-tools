import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAsyncFetch, useAsyncApiFetch } from '@/hooks/use-async-fetch'

describe('useAsyncFetch', () => {
  describe('basic functionality', () => {
    it('should initialize with default state', () => {
      const asyncFn = async () => 'result'

      const { result } = renderHook(() => useAsyncFetch(asyncFn))

      expect(result.current.data).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should set loading state during execution', async () => {
      let resolvePromise: (value: string) => void
      const asyncFn = () =>
        new Promise<string>((resolve) => {
          resolvePromise = resolve
        })

      const { result } = renderHook(() => useAsyncFetch(asyncFn))

      act(() => {
        result.current.execute()
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        resolvePromise!('result')
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should set data on successful execution', async () => {
      const asyncFn = async () => ({ name: 'test', value: 42 })

      const { result } = renderHook(() => useAsyncFetch(asyncFn))

      await act(async () => {
        await result.current.execute()
      })

      expect(result.current.data).toEqual({ name: 'test', value: 42 })
      expect(result.current.error).toBeNull()
    })

    it('should set error on failure', async () => {
      const asyncFn = async () => {
        throw new Error('Test error')
      }

      const { result } = renderHook(() => useAsyncFetch(asyncFn))

      await act(async () => {
        await result.current.execute()
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Test error')
      expect(result.current.data).toBeNull()
    })

    it('should handle non-Error throws', async () => {
      const asyncFn = async () => {
        throw 'string error'
      }

      const { result } = renderHook(() => useAsyncFetch(asyncFn))

      await act(async () => {
        await result.current.execute()
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('An unknown error occurred')
    })

    it('should return result from execute', async () => {
      const asyncFn = async () => 'result'

      const { result } = renderHook(() => useAsyncFetch(asyncFn))

      let executeResult: string | null = null
      await act(async () => {
        executeResult = await result.current.execute()
      })

      expect(executeResult).toBe('result')
    })

    it('should return null from execute on error', async () => {
      const asyncFn = async () => {
        throw new Error('Test error')
      }

      const { result } = renderHook(() => useAsyncFetch(asyncFn))

      let executeResult: unknown = 'not-null'
      await act(async () => {
        executeResult = await result.current.execute()
      })

      expect(executeResult).toBeNull()
    })
  })

  describe('reset functionality', () => {
    it('should reset all state', async () => {
      const asyncFn = async () => 'result'

      const { result } = renderHook(() => useAsyncFetch(asyncFn))

      await act(async () => {
        await result.current.execute()
      })

      expect(result.current.data).toBe('result')

      act(() => {
        result.current.reset()
      })

      expect(result.current.data).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should reset after error', async () => {
      const asyncFn = async () => {
        throw new Error('Test error')
      }

      const { result } = renderHook(() => useAsyncFetch(asyncFn))

      await act(async () => {
        await result.current.execute()
      })

      expect(result.current.error).not.toBeNull()

      act(() => {
        result.current.reset()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('callbacks', () => {
    it('should call onSuccess callback', async () => {
      const onSuccess = mock(() => {})
      const asyncFn = async () => 'result'

      const { result } = renderHook(() => useAsyncFetch(asyncFn, { onSuccess }))

      await act(async () => {
        await result.current.execute()
      })

      expect(onSuccess).toHaveBeenCalledWith('result')
    })

    it('should call onError callback', async () => {
      const onError = mock(() => {})
      const asyncFn = async () => {
        throw new Error('Test error')
      }

      const { result } = renderHook(() => useAsyncFetch(asyncFn, { onError }))

      await act(async () => {
        await result.current.execute()
      })

      expect(onError).toHaveBeenCalled()
      const errorArg = (onError as any).mock.calls[0][0]
      expect(errorArg.message).toBe('Test error')
    })
  })

  describe('shouldExecute option', () => {
    it('should skip execution when shouldExecute returns false', async () => {
      const asyncFn = mock(async () => 'result')

      const { result } = renderHook(() =>
        useAsyncFetch(asyncFn, {
          shouldExecute: () => false,
        })
      )

      await act(async () => {
        await result.current.execute()
      })

      expect(asyncFn).not.toHaveBeenCalled()
      expect(result.current.data).toBeNull()
    })

    it('should execute when shouldExecute returns true', async () => {
      const asyncFn = mock(async () => 'result')

      const { result } = renderHook(() =>
        useAsyncFetch(asyncFn, {
          shouldExecute: () => true,
        })
      )

      await act(async () => {
        await result.current.execute()
      })

      expect(asyncFn).toHaveBeenCalled()
    })

    it('should pass arguments to shouldExecute', async () => {
      const shouldExecute = mock(() => true)
      const asyncFn = async (arg1: unknown, arg2: unknown) => ({ arg1, arg2 })

      const { result } = renderHook(() => useAsyncFetch(asyncFn, { shouldExecute }))

      await act(async () => {
        await result.current.execute('a', 'b')
      })

      expect(shouldExecute).toHaveBeenCalledWith('a', 'b')
    })
  })

  describe('caching', () => {
    it('should cache results', async () => {
      const cache = new Map<string, string>()
      const asyncFn = mock(async (key: unknown) => `result-${key}`)

      const { result } = renderHook(() =>
        useAsyncFetch(asyncFn, {
          cache,
          getCacheKey: (key: unknown) => String(key),
        })
      )

      // First call - should execute
      await act(async () => {
        await result.current.execute('test')
      })

      expect(asyncFn).toHaveBeenCalledTimes(1)
      expect(result.current.data).toBe('result-test')

      // Second call with same key - should use cache
      await act(async () => {
        await result.current.execute('test')
      })

      expect(asyncFn).toHaveBeenCalledTimes(1) // Not called again
      expect(result.current.data).toBe('result-test')
    })

    it('should call onSuccess for cached results', async () => {
      const cache = new Map<string, string>()
      const onSuccess = mock(() => {})
      const asyncFn = async () => 'result'

      const { result } = renderHook(() =>
        useAsyncFetch(asyncFn, {
          cache,
          getCacheKey: () => 'key',
          onSuccess,
        })
      )

      await act(async () => {
        await result.current.execute()
      })

      await act(async () => {
        await result.current.execute()
      })

      expect(onSuccess).toHaveBeenCalledTimes(2)
    })

    it('should store results in cache', async () => {
      const cache = new Map<string, string>()
      const asyncFn = async () => 'cached-value'

      const { result } = renderHook(() =>
        useAsyncFetch(asyncFn, {
          cache,
          getCacheKey: () => 'my-key',
        })
      )

      await act(async () => {
        await result.current.execute()
      })

      expect(cache.get('my-key')).toBe('cached-value')
    })
  })

  describe('arguments passing', () => {
    it('should pass arguments to async function', async () => {
      const asyncFn = async (a: unknown, b: unknown, c: unknown) => ({ a, b, c })

      const { result } = renderHook(() => useAsyncFetch(asyncFn))

      await act(async () => {
        await result.current.execute(1, 'two', { three: 3 })
      })

      expect(result.current.data).toEqual({ a: 1, b: 'two', c: { three: 3 } })
    })
  })
})

describe('useAsyncApiFetch', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response)
    )
  })

  it('should fetch from static URL', async () => {
    const { result } = renderHook(() =>
      useAsyncApiFetch<{ data: string }>('https://api.example.com/data')
    )

    await act(async () => {
      await result.current.execute()
    })

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/data', expect.any(Object))
    expect(result.current.data).toEqual({ data: 'test' })
  })

  it('should fetch from dynamic URL', async () => {
    const { result } = renderHook(() =>
      useAsyncApiFetch<{ data: string }>((id: unknown) => `https://api.example.com/items/${id}`)
    )

    await act(async () => {
      await result.current.execute(123)
    })

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/items/123', expect.any(Object))
  })

  it('should handle fetch error response', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Resource not found' }),
      } as Response)
    )

    const { result } = renderHook(() =>
      useAsyncApiFetch<{ data: string }>('https://api.example.com/data')
    )

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toContain('404')
    expect(result.current.error?.message).toContain('Not Found')
  })

  it('should handle fetch error response with non-JSON body', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Not JSON')),
      } as Response)
    )

    const { result } = renderHook(() =>
      useAsyncApiFetch<{ data: string }>('https://api.example.com/data')
    )

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toContain('500')
  })

  it('should pass RequestInit options', async () => {
    const { result } = renderHook(() =>
      useAsyncApiFetch<{ data: string }>('https://api.example.com/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await act(async () => {
      await result.current.execute()
    })

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/data',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  // Restore fetch after tests
  afterEach(() => {
    globalThis.fetch = originalFetch
  })
})
