import { useState, useCallback } from 'react'

interface UseClipboardOptions {
  /** Duration in ms to show copied status (default: 2000ms) */
  successDuration?: number
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  const copyWithTextArea = () => {
    if (typeof document === 'undefined') return false

    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.setAttribute('readonly', '')
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)

    textArea.focus()
    textArea.select()

    try {
      return document.execCommand?.('copy') ?? false
    } finally {
      document.body.removeChild(textArea)
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    return copyWithTextArea()
  }

  return copyWithTextArea()
}

/**
 * Hook for copying text to the clipboard
 * @param options Configuration options
 * @returns Object with copy function and copied status
 */
export function useClipboard({ successDuration = 2000 }: UseClipboardOptions = {}) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(
    async (text: string) => {
      const success = await copyTextToClipboard(text)

      if (!success) {
        return false
      }

      setCopied(true)

      // Reset copied state after specified duration
      setTimeout(() => {
        setCopied(false)
      }, successDuration)

      return true
    },
    [successDuration]
  )

  return { copy, copied }
}
