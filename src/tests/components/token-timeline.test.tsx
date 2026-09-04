import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { TokenTimeline } from '@/features/tokenInspector/components/TokenTimeline'

afterEach(cleanup)

describe('TokenTimeline', () => {
  test('renders a readable error for untrusted out-of-range dates', () => {
    render(<TokenTimeline payload={{ iat: 1e100, exp: 1e101 }} />)
    expect(screen.getByText('Missing or invalid timestamps')).toBeDefined()
  })

  test('rejects reversed lifetimes instead of rendering negative progress', () => {
    render(<TokenTimeline payload={{ iat: 20, exp: 10 }} />)
    expect(screen.getByText('Invalid token lifetime')).toBeDefined()
  })

  test('supports the Unix epoch rather than treating zero as missing', () => {
    render(<TokenTimeline payload={{ iat: 0, exp: 1, auth_time: 0 }} />)
    expect(screen.getByText('Total Lifetime')).toBeDefined()
    expect(screen.getByText('Authentication Time')).toBeDefined()
  })
})
