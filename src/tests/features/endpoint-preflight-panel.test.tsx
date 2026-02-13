import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EndpointPreflightPanel } from '@/features/oauthPlayground/components/EndpointPreflightPanel'

const runOidcEndpointPreflightMock = mock(async () => ({
  issuerUrl: 'https://issuer.example.com',
  normalizedIssuerUrl: 'https://issuer.example.com',
  discoveryUrl: 'https://issuer.example.com/.well-known/openid-configuration',
  generatedAt: new Date(0).toISOString(),
  summary: { pass: 1, warn: 0, fail: 0 },
  endpoints: [
    {
      endpoint: 'discovery',
      label: 'Discovery document',
      method: 'GET',
      status: 'pass',
      required: true,
      reasonCode: 'reachable',
      message: 'Discovery document resolved (200)',
    },
  ],
}))

describe('EndpointPreflightPanel', () => {
  beforeEach(() => {
    runOidcEndpointPreflightMock.mockClear()
  })

  test('auto-runs once per trigger value and emits report via onReport', async () => {
    const onReport = mock(() => {})
    const onIssuerUrlChange = mock(() => {})

    const { rerender } = render(
      <EndpointPreflightPanel
        issuerUrl="https://issuer.example.com"
        onIssuerUrlChange={onIssuerUrlChange}
        autoRunTrigger={1}
        onReport={onReport}
        preflightRunner={runOidcEndpointPreflightMock}
      />
    )

    await waitFor(() => {
      expect(runOidcEndpointPreflightMock).toHaveBeenCalledTimes(1)
    })

    expect(onReport).toHaveBeenCalledTimes(1)

    rerender(
      <EndpointPreflightPanel
        issuerUrl="https://issuer.example.com/tenant"
        onIssuerUrlChange={onIssuerUrlChange}
        autoRunTrigger={1}
        onReport={onReport}
        preflightRunner={runOidcEndpointPreflightMock}
      />
    )

    await waitFor(() => {
      expect(runOidcEndpointPreflightMock).toHaveBeenCalledTimes(1)
    })

    rerender(
      <EndpointPreflightPanel
        issuerUrl="https://issuer.example.com/tenant"
        onIssuerUrlChange={onIssuerUrlChange}
        autoRunTrigger={2}
        onReport={onReport}
        preflightRunner={runOidcEndpointPreflightMock}
      />
    )

    await waitFor(() => {
      expect(runOidcEndpointPreflightMock).toHaveBeenCalledTimes(2)
    })
  })

  test('does not auto-run when trigger is set but issuer URL is blank', async () => {
    render(
      <EndpointPreflightPanel
        issuerUrl=""
        onIssuerUrlChange={() => {}}
        autoRunTrigger={1}
        preflightRunner={runOidcEndpointPreflightMock}
      />
    )

    await waitFor(() => {
      expect(runOidcEndpointPreflightMock).not.toHaveBeenCalled()
    })
  })

  test('supports manual run button without auto-run trigger', async () => {
    render(
      <EndpointPreflightPanel
        issuerUrl="https://issuer.example.com"
        onIssuerUrlChange={() => {}}
        preflightRunner={runOidcEndpointPreflightMock}
      />
    )

    fireEvent.click(screen.getByTestId('oidc-preflight-run-button'))

    await waitFor(() => {
      expect(runOidcEndpointPreflightMock).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByTestId('oidc-preflight-report')).toBeTruthy()
  })
})
