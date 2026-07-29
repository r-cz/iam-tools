import React from 'react'
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, waitFor } from '@testing-library/react'
import EnvironmentHealthPage from '@/features/environment-health'
import type { OidcPreflightReport } from '@/features/oauthPlayground/utils/oidc-preflight'
import { STORAGE_KEYS } from '@/lib/state/constants'
import { renderWithProviders } from '../utils/test-utils'

const originalClipboard = navigator.clipboard

const completedReport: OidcPreflightReport = {
  issuerUrl: 'https://login.example.com',
  normalizedIssuerUrl: 'https://login.example.com',
  discoveryUrl: 'https://login.example.com/.well-known/openid-configuration',
  generatedAt: '2026-07-28T15:00:00.000Z',
  summary: { pass: 2, warn: 1, fail: 0 },
  endpoints: [
    {
      endpoint: 'discovery',
      label: 'Discovery document',
      method: 'GET',
      status: 'pass',
      required: true,
      reasonCode: 'reachable',
      url: 'https://login.example.com/.well-known/openid-configuration',
      httpStatus: 200,
      message: 'Discovery document resolved (200)',
    },
    {
      endpoint: 'token_endpoint',
      label: 'Token endpoint',
      method: 'POST',
      status: 'pass',
      required: true,
      reasonCode: 'auth_required',
      url: 'https://login.example.com/oauth2/token',
      httpStatus: 401,
      message: 'Reachable but requires auth/input validation (401)',
    },
    {
      endpoint: 'userinfo_endpoint',
      label: 'UserInfo endpoint',
      method: 'GET',
      status: 'warn',
      required: false,
      reasonCode: 'missing_or_unavailable',
      url: 'https://login.example.com/userinfo',
      message: 'Optional endpoint unavailable',
    },
  ],
}

function byTestId(container: HTMLElement, testId: string): HTMLElement {
  const element = container.querySelector(`[data-testid="${testId}"]`)
  if (!element) {
    throw new Error(`Missing test id: ${testId}`)
  }
  return element as HTMLElement
}

describe('EnvironmentHealthPage', () => {
  beforeEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
  })

  test('does not run checks until the user explicitly starts one', () => {
    const runner = mock(async () => completedReport)
    const view = renderWithProviders(
      <EnvironmentHealthPage preflightRunner={runner} isOnline={() => true} />
    )

    expect(runner).not.toHaveBeenCalled()
    expect(byTestId(view.container, 'environment-health-status').dataset.state).toBe('idle')
    expect(
      (byTestId(view.container, 'environment-health-copy-button') as HTMLButtonElement).disabled
    ).toBe(true)
  })

  test('runs a custom issuer check, summarizes results, and expands normalized details', async () => {
    const runner = mock(async () => completedReport)
    const view = renderWithProviders(
      <EnvironmentHealthPage preflightRunner={runner} isOnline={() => true} />
    )

    fireEvent.change(byTestId(view.container, 'environment-health-issuer-input'), {
      target: { value: 'https://login.example.com' },
    })
    fireEvent.click(byTestId(view.container, 'environment-health-run-button'))

    await waitFor(() => {
      expect(runner).toHaveBeenCalledTimes(1)
      expect(byTestId(view.container, 'environment-health-status').dataset.state).toBe('completed')
    })

    expect(runner).toHaveBeenCalledWith({
      issuerUrl: 'https://login.example.com',
      requiredEndpoints: ['authorization_endpoint', 'token_endpoint', 'jwks_uri'],
      includeOptionalEndpoints: true,
      enableServerAssistedProbes: false,
    })
    expect(byTestId(view.container, 'environment-health-summary-pass').textContent).toContain('2')
    expect(byTestId(view.container, 'environment-health-summary-warning').textContent).toContain(
      '1'
    )
    expect(byTestId(view.container, 'environment-health-summary-fail').textContent).toContain('0')
    expect(
      (byTestId(view.container, 'environment-health-copy-button') as HTMLButtonElement).disabled
    ).toBe(false)

    fireEvent.click(byTestId(view.container, 'environment-health-expand-token_endpoint-desktop'))
    expect(view.container.textContent).toContain('auth required')
    expect(view.container.textContent).toContain(
      'Raw provider errors are withheld because they can include sensitive response data.'
    )
  })

  test('only shows copy success for the report that was copied', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: mock(async () => undefined) },
    })
    let runNumber = 0
    const runner = mock(async (): Promise<OidcPreflightReport> => {
      runNumber += 1
      return {
        ...completedReport,
        generatedAt: `2026-07-28T15:00:0${runNumber}.000Z`,
      }
    })
    const view = renderWithProviders(
      <EnvironmentHealthPage preflightRunner={runner} isOnline={() => true} />
    )
    const issuerInput = byTestId(
      view.container,
      'environment-health-issuer-input'
    ) as HTMLInputElement
    const runButton = byTestId(view.container, 'environment-health-run-button')
    const copyButton = byTestId(view.container, 'environment-health-copy-button')

    fireEvent.change(issuerInput, {
      target: { value: 'https://login.example.com' },
    })
    fireEvent.click(runButton)
    await waitFor(() => {
      expect(byTestId(view.container, 'environment-health-status').dataset.state).toBe('completed')
    })

    fireEvent.click(copyButton)
    await waitFor(() => {
      expect(copyButton.textContent).toContain('Report copied')
    })

    fireEvent.change(issuerInput, {
      target: { value: 'https://login-two.example.com' },
    })
    await waitFor(() => {
      expect(copyButton.textContent).toContain('Copy report')
    })

    fireEvent.click(runButton)
    await waitFor(() => {
      expect(runner).toHaveBeenCalledTimes(2)
      expect(byTestId(view.container, 'environment-health-status').dataset.state).toBe('completed')
    })
    expect(copyButton.textContent).toContain('Copy report')
  })

  test('shows running state and clears it when a report completes', async () => {
    let resolveReport: ((value: OidcPreflightReport) => void) | undefined
    const runner = mock(
      () =>
        new Promise<OidcPreflightReport>((resolve) => {
          resolveReport = resolve
        })
    )
    const view = renderWithProviders(
      <EnvironmentHealthPage preflightRunner={runner} isOnline={() => true} />
    )

    fireEvent.change(byTestId(view.container, 'environment-health-issuer-input'), {
      target: { value: 'https://login.example.com' },
    })
    fireEvent.click(byTestId(view.container, 'environment-health-run-button'))

    expect(byTestId(view.container, 'environment-health-status').dataset.state).toBe('running')
    expect(
      (byTestId(view.container, 'environment-health-run-button') as HTMLButtonElement).disabled
    ).toBe(true)

    resolveReport?.(completedReport)

    await waitFor(() => {
      expect(byTestId(view.container, 'environment-health-status').dataset.state).toBe('completed')
    })
  })

  test('attempts checks despite an offline hint and treats a network failure as unavailable', async () => {
    const runner = mock(async (): Promise<OidcPreflightReport> => ({
      issuerUrl: 'https://login.example.com',
      normalizedIssuerUrl: 'https://login.example.com',
      discoveryUrl: 'https://login.example.com/.well-known/openid-configuration',
      generatedAt: '2026-07-28T15:00:00.000Z',
      summary: { pass: 0, warn: 0, fail: 1 },
      endpoints: [
        {
          endpoint: 'discovery',
          label: 'Discovery document',
          method: 'GET',
          status: 'fail',
          required: true,
          reasonCode: 'network_or_cors',
          message: 'Discovery document could not be reached',
          error: 'Failed to fetch',
        },
      ],
    }))
    const view = renderWithProviders(
      <EnvironmentHealthPage preflightRunner={runner} isOnline={() => false} />
    )

    fireEvent.change(byTestId(view.container, 'environment-health-issuer-input'), {
      target: { value: 'https://login.example.com' },
    })
    fireEvent.click(byTestId(view.container, 'environment-health-run-button'))

    await waitFor(() => {
      expect(runner).toHaveBeenCalledTimes(1)
      expect(byTestId(view.container, 'environment-health-status').dataset.state).toBe(
        'unavailable'
      )
    })
    expect(byTestId(view.container, 'environment-health-status').textContent).toContain(
      'reachability is unknown, not failed'
    )
    expect(view.container.querySelector('[data-testid="environment-health-summary"]')).toBeNull()
  })

  test('does not discard a successful report when the browser offline hint is stale', async () => {
    const runner = mock(async () => completedReport)
    const view = renderWithProviders(
      <EnvironmentHealthPage preflightRunner={runner} isOnline={() => false} />
    )

    fireEvent.change(byTestId(view.container, 'environment-health-issuer-input'), {
      target: { value: 'https://login.example.com' },
    })
    fireEvent.click(byTestId(view.container, 'environment-health-run-button'))

    await waitFor(() => {
      expect(byTestId(view.container, 'environment-health-status').dataset.state).toBe('completed')
    })
  })

  test('retains an online discovery network failure as a completed failed report', async () => {
    const runner = mock(async (): Promise<OidcPreflightReport> => ({
      issuerUrl: 'https://dead.example.com',
      normalizedIssuerUrl: 'https://dead.example.com',
      discoveryUrl: 'https://dead.example.com/.well-known/openid-configuration',
      generatedAt: '2026-07-28T15:00:00.000Z',
      summary: { pass: 0, warn: 0, fail: 1 },
      endpoints: [
        {
          endpoint: 'discovery',
          label: 'Discovery document',
          method: 'GET',
          status: 'fail',
          required: true,
          reasonCode: 'network_or_cors',
          message: 'Discovery document could not be reached',
          error: 'Failed to fetch',
        },
      ],
    }))
    const view = renderWithProviders(
      <EnvironmentHealthPage preflightRunner={runner} isOnline={() => true} />
    )

    fireEvent.change(byTestId(view.container, 'environment-health-issuer-input'), {
      target: { value: 'https://dead.example.com' },
    })
    fireEvent.click(byTestId(view.container, 'environment-health-run-button'))

    await waitFor(() => {
      expect(byTestId(view.container, 'environment-health-status').dataset.state).toBe('completed')
    })
    expect(byTestId(view.container, 'environment-health-summary-fail').textContent).toContain('1')
    expect(byTestId(view.container, 'environment-health-status').textContent).not.toContain(
      'offline'
    )
  })

  test('does not call an unrelated thrown error an offline failure', async () => {
    const runner = mock(async () => {
      throw new Error('Invalid discovery document')
    })
    const view = renderWithProviders(
      <EnvironmentHealthPage preflightRunner={runner} isOnline={() => false} />
    )

    fireEvent.change(byTestId(view.container, 'environment-health-issuer-input'), {
      target: { value: 'https://login.example.com' },
    })
    fireEvent.click(byTestId(view.container, 'environment-health-run-button'))

    await waitFor(() => {
      expect(byTestId(view.container, 'environment-health-status').dataset.state).toBe('error')
    })
    expect(byTestId(view.container, 'environment-health-status').textContent).not.toContain(
      'offline'
    )
  })

  test('loads the most recently used saved environment and supports switching to custom', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.ENVIRONMENT_PROFILES,
      JSON.stringify([
        {
          id: 'production',
          name: 'Production',
          issuerUrl: 'https://login.example.com',
          scopes: ['openid'],
          createdAt: 1,
          updatedAt: 1,
          lastUsedAt: 2,
        },
      ])
    )

    const view = renderWithProviders(
      <EnvironmentHealthPage preflightRunner={mock(async () => completedReport)} />
    )
    const environmentSelect = byTestId(
      view.container,
      'environment-health-environment-select'
    ) as HTMLSelectElement
    const issuerInput = byTestId(
      view.container,
      'environment-health-issuer-input'
    ) as HTMLInputElement

    expect(environmentSelect.value).toBe('production')
    expect(issuerInput.value).toBe('https://login.example.com')

    fireEvent.change(environmentSelect, { target: { value: '__custom_environment__' } })
    expect(issuerInput.value).toBe('')
  })

  test('shows a safe error without exposing a thrown provider error', async () => {
    const runner = mock(async () => {
      throw new Error('client_secret=do-not-render')
    })
    const view = renderWithProviders(
      <EnvironmentHealthPage preflightRunner={runner} isOnline={() => true} />
    )

    fireEvent.change(byTestId(view.container, 'environment-health-issuer-input'), {
      target: { value: 'https://login.example.com' },
    })
    fireEvent.click(byTestId(view.container, 'environment-health-run-button'))

    await waitFor(() => {
      expect(byTestId(view.container, 'environment-health-status').dataset.state).toBe('error')
    })

    expect(view.container.textContent).not.toContain('do-not-render')
    expect(view.container.textContent).toContain('Confirm the issuer URL and try again')
  })
})
