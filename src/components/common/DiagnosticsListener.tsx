import { useEffect } from 'react'

import { recordUnhandledRejection, recordWindowError } from '@/lib/diagnostics/client-diagnostics'

export function DiagnosticsListener() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleError = () => {
      recordWindowError()
    }

    const handleRejection = () => {
      recordUnhandledRejection()
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}
