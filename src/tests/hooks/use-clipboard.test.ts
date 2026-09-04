import { afterEach, describe, expect, test, spyOn } from 'bun:test'
import { act, renderHook, waitFor } from '@testing-library/react'
import { copyTextToClipboard, useClipboard } from '@/hooks/use-clipboard'

const originalClipboard = navigator.clipboard
const originalExecCommand = document.execCommand

function setClipboard(writeText?: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  })
}

function setExecCommand(execCommand?: (commandId: string) => boolean) {
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: execCommand,
  })
}

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: originalClipboard,
  })
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: originalExecCommand,
  })
  document.body.innerHTML = ''
})

describe('copyTextToClipboard', () => {
  test('uses the Clipboard API when it succeeds', async () => {
    const writes: string[] = []
    setClipboard(async (text) => {
      writes.push(text)
    })
    setExecCommand(() => {
      throw new Error('fallback should not run')
    })

    await expect(copyTextToClipboard('hello')).resolves.toBe(true)
    expect(writes).toEqual(['hello'])
  })

  test('falls back to textarea copy when Clipboard API permission is denied', async () => {
    let fallbackCommand = ''
    setClipboard(async () => {
      throw new DOMException('Write permission denied', 'NotAllowedError')
    })
    setExecCommand((commandId) => {
      fallbackCommand = commandId
      const active = document.activeElement as HTMLTextAreaElement | null
      expect(active?.value).toBe('fallback text')
      return true
    })

    await expect(copyTextToClipboard('fallback text')).resolves.toBe(true)
    expect(fallbackCommand).toBe('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  test('returns false when Clipboard API and fallback copy both fail', async () => {
    setClipboard(async () => {
      throw new Error('clipboard unavailable')
    })
    setExecCommand(() => false)

    await expect(copyTextToClipboard('not copied')).resolves.toBe(false)
  })
})

describe('useClipboard', () => {
  test('restarts the success timer on each copy and cancels it on unmount', async () => {
    setClipboard(async () => {})
    const { result, unmount } = renderHook(() => useClipboard({ successDuration: 1000 }))
    const callbacks = new Map<number, () => void>()
    let nextTimer = 0
    const timeout = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => {
      const timer = ++nextTimer
      callbacks.set(timer, callback)
      return timer
    }) as typeof setTimeout)
    const clear = spyOn(globalThis, 'clearTimeout').mockImplementation((timer) => {
      callbacks.delete(Number(timer))
    })
    try {
      await act(async () => {
        await result.current.copy('first')
      })
      expect(callbacks.size).toBe(1)
      const firstTimer = nextTimer
      await act(async () => {
        await result.current.copy('second')
      })
      expect(callbacks.has(firstTimer)).toBe(false)
      expect(callbacks.size).toBe(1)
      expect(result.current.copied).toBe(true)
      act(() => {
        callbacks.get(nextTimer)?.()
      })
      expect(result.current.copied).toBe(false)
      callbacks.clear()
      await act(async () => {
        await result.current.copy('third')
      })
      unmount()
      expect(callbacks.size).toBe(0)
    } finally {
      timeout.mockRestore()
      clear.mockRestore()
    }
  })

  test('sets copied only after a successful fallback copy', async () => {
    setClipboard(async () => {
      throw new DOMException('Write permission denied', 'NotAllowedError')
    })
    setExecCommand(() => true)

    const { result } = renderHook(() => useClipboard({ successDuration: 20 }))

    let copied = false
    await act(async () => {
      copied = await result.current.copy('hook copy')
    })

    expect(copied).toBe(true)
    expect(result.current.copied).toBe(true)

    await waitFor(() => {
      expect(result.current.copied).toBe(false)
    })
  })
})
