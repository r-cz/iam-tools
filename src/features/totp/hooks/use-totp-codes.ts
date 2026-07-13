import { useEffect, useState } from 'react'
import { generateTotp, type TotpAlgorithm } from '@/features/totp/utils'

interface UseTotpCodesOptions {
  secret?: string
  algorithm: TotpAlgorithm
  digits: number
  period: number
}

export interface TotpCodeWindow {
  previous: string
  current: string
  next: string
  /** RFC 6238 moving-factor counter for the displayed current code. */
  step: number
  secondsRemaining: number
  error?: string
}

interface GeneratedCodes extends Omit<TotpCodeWindow, 'secondsRemaining' | 'step'> {
  key: string
}

export function useTotpCodes({
  secret,
  algorithm,
  digits,
  period,
}: UseTotpCodesOptions): TotpCodeWindow | null {
  const [now, setNow] = useState(() => Date.now())
  const [codes, setCodes] = useState<GeneratedCodes | null>(null)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const timestampSeconds = Math.floor(now / 1000)
  const step = Math.floor(timestampSeconds / period)
  const secondsRemaining = period - (timestampSeconds % period)
  const generationKey = `${secret ?? ''}:${algorithm}:${digits}:${period}:${step}`

  useEffect(() => {
    if (!secret) {
      return
    }

    let cancelled = false
    const stepTimestamp = step * period
    Promise.all(
      [-1, 0, 1].map((delta) =>
        generateTotp(secret, {
          timestamp: stepTimestamp + delta * period,
          algorithm,
          digits,
          period,
        })
      )
    )
      .then(([previous, current, next]) => {
        if (!cancelled) setCodes({ key: generationKey, previous, current, next })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCodes({
            key: generationKey,
            previous: '',
            current: '',
            next: '',
            error: error instanceof Error ? error.message : 'Unable to generate TOTP codes.',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [algorithm, digits, generationKey, period, secret, step])

  if (!secret || !codes || codes.key !== generationKey) return null

  return {
    previous: codes.previous,
    current: codes.current,
    next: codes.next,
    step,
    secondsRemaining,
    ...(codes.error ? { error: codes.error } : {}),
  }
}
