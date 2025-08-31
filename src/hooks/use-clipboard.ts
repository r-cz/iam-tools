import { useState, useCallback } from 'react'

interface UseClipboardOptions {
  /** Duration in ms to show copied status (default: 2000ms) */
  successDuration?: number
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
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text)
          setCopied(true)

          // Reset copied state after specified duration
          setTimeout(() => {
            setCopied(false)
          }, successDuration)

          return true
        } else {
          // Fallback for browsers without clipboard API
          const textArea = document.createElement('textarea')
          textArea.value = text

          // Make the textarea out of viewport
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)

          textArea.focus()
          textArea.select()

          const success = document.execCommand('copy')
          document.body.removeChild(textArea)

          if (success) {
            setCopied(true)
            setTimeout(() => {
              setCopied(false)
            }, successDuration)
            return true
          }
          return false
        }
      } catch (error) {
        console.error('Failed to copy text: ', error)
        return false
      }
    },
    [successDuration]
  )

  return { copy, copied }
}
