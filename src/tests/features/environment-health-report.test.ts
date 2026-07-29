import { describe, expect, test } from 'bun:test'
import type { OidcPreflightReport } from '@/features/oauthPlayground/utils/oidc-preflight'
import {
  buildRedactedEnvironmentHealthReport,
  prepareEnvironmentHealthReport,
  serializeRedactedEnvironmentHealthReport,
} from '@/features/environment-health/report'

const reportWithSensitiveData: OidcPreflightReport = {
  issuerUrl: 'https://user:issuer-password@login.example.com/tenant?api_key=issuer-secret',
  normalizedIssuerUrl:
    'https://user:issuer-password@login.example.com/tenant?api_key=issuer-secret',
  discoveryUrl:
    'https://login.example.com/tenant/.well-known/openid-configuration?access_token=secret',
  generatedAt: '2026-07-28T15:00:00.000Z',
  summary: { pass: 1, warn: 1, fail: 0 },
  config: {
    issuer: 'https://login.example.com/tenant',
    authorization_endpoint: 'https://login.example.com/authorize?client_secret=config-secret',
    token_endpoint: 'https://login.example.com/token',
    jwks_uri: 'https://login.example.com/jwks',
    private_key: 'raw-config-secret',
  },
  endpoints: [
    {
      endpoint: 'discovery',
      label: 'Discovery document',
      method: 'GET',
      status: 'pass',
      required: true,
      reasonCode: 'reachable',
      url: 'https://login.example.com/.well-known/openid-configuration?token=url-secret',
      httpStatus: 200,
      httpStatusText: 'OK',
      message: 'Discovery document resolved (200)',
    },
    {
      endpoint: 'userinfo_endpoint',
      label: 'UserInfo endpoint',
      method: 'GET',
      status: 'warn',
      required: false,
      reasonCode: 'network_or_cors',
      url: 'https://login.example.com/userinfo?access_token=endpoint-secret',
      message: 'Browser probe blocked by CORS/network; endpoint may still be healthy',
      error: 'Authorization: Bearer raw-error-secret',
    },
  ],
}

describe('environment health redacted report', () => {
  test('keeps useful classifications while excluding raw config, URLs, errors, and credentials', () => {
    const redacted = buildRedactedEnvironmentHealthReport(reportWithSensitiveData)
    const serialized = serializeRedactedEnvironmentHealthReport(reportWithSensitiveData)

    expect(redacted.issuer).toBe('https://login.example.com/tenant')
    expect(redacted.summary).toEqual({ pass: 1, warning: 1, fail: 0 })
    expect(redacted.checks[1]?.result).toBe('warning')
    expect(redacted.checks[1]?.classification).toBe('network_or_cors')

    expect(serialized).not.toContain('raw-config-secret')
    expect(serialized).not.toContain('raw-error-secret')
    expect(serialized).not.toContain('issuer-password')
    expect(serialized).not.toContain('endpoint-secret')
    expect(serialized).not.toContain('config-secret')
    expect(serialized).not.toContain('access_token')
    expect(serialized).not.toContain('"config"')
    expect(serialized).not.toContain('"error"')
    expect(serialized).not.toContain('"url"')
  })

  test('omits unadvertised optional endpoints and recomputes summary counts', () => {
    const prepared = prepareEnvironmentHealthReport({
      ...reportWithSensitiveData,
      summary: { pass: 1, warn: 2, fail: 0 },
      endpoints: [
        ...reportWithSensitiveData.endpoints,
        {
          endpoint: 'introspection_endpoint',
          label: 'Introspection endpoint',
          method: 'POST',
          status: 'warn',
          required: false,
          reasonCode: 'missing_or_unavailable',
          message: 'Optional endpoint unavailable',
        },
      ],
    })

    expect(prepared.endpoints.map((result) => result.endpoint)).toEqual([
      'discovery',
      'userinfo_endpoint',
    ])
    expect(prepared.summary).toEqual({ pass: 1, warn: 1, fail: 0 })
  })
})
