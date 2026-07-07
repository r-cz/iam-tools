import { afterEach, describe, expect, test } from 'bun:test'
import { act, renderHook, waitFor } from '@testing-library/react'
import { copyTextToClipboard, useClipboard } from '@/hooks/use-clipboard'
import '../utils/dom-setup'

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
