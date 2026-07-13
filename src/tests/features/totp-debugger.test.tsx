import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import TotpDebuggerPage, { buildTotpVerificationKey } from '@/features/totp/pages'

if (!globalThis.DocumentFragment && window.DocumentFragment) {
  ;(
    globalThis as typeof globalThis & { DocumentFragment: typeof DocumentFragment }
  ).DocumentFragment = window.DocumentFragment
}

afterEach(() => {
  cleanup()
})

describe('TOTP Debugger', () => {
  it('renders nonstandard digits and period parsed from an otpauth URI', () => {
    const view = render(<TotpDebuggerPage />)
    const input = view.getByTestId('totp-secret-input')

    fireEvent.change(input, {
      target: {
        value:
          'otpauth://totp/Example:alice?secret=JBSWY3DPEHPK3PXP&issuer=Example&digits=7&period=45',
      },
    })

    expect((view.getByTestId('totp-effective-digits') as HTMLInputElement).value).toBe('7 digits')
    expect((view.getByTestId('totp-effective-period') as HTMLInputElement).value).toBe('45 seconds')
    expect(view.container.textContent).toContain('Read from the otpauth URI.')
  })

  it('changes the verification identity when the displayed time step advances', () => {
    const base = {
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA1' as const,
      digits: 6,
      period: 30,
      candidateCode: '123456',
      driftWindow: 1,
    }

    const verifiedAtStep = buildTotpVerificationKey({ ...base, step: 100 })
    const currentStep = buildTotpVerificationKey({ ...base, step: 101 })

    expect(currentStep).not.toBe(verifiedAtStep)
  })
})
