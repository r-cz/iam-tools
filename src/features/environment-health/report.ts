import type { OidcPreflightReport } from '@/features/oauthPlayground/utils/oidc-preflight'

export const HEALTH_REPORT_DISCLAIMER =
  'Reachability is not proof that an environment is secure or correctly configured.'

export interface RedactedEnvironmentHealthReport {
  reportType: 'OIDC environment health'
  generatedAt: string
  issuer: string
  disclaimer: string
  summary: {
    pass: number
    warning: number
    fail: number
  }
  checks: Array<{
    check: string
    method: string
    result: 'pass' | 'warning' | 'fail'
    required: boolean
    classification: string
    message: string
    httpStatus?: number
  }>
}

/**
 * Builds the only representation that may leave the page through the clipboard.
 *
 * Raw discovery configuration, endpoint URLs, provider error bodies, and thrown
 * errors are intentionally omitted because they can contain credentials or
 * deployment-specific secrets.
 */
export function buildRedactedEnvironmentHealthReport(
  report: OidcPreflightReport
): RedactedEnvironmentHealthReport {
  return {
    reportType: 'OIDC environment health',
    generatedAt: report.generatedAt,
    issuer: redactIssuer(report.normalizedIssuerUrl),
    disclaimer: HEALTH_REPORT_DISCLAIMER,
    summary: {
      pass: report.summary.pass,
      warning: report.summary.warn,
      fail: report.summary.fail,
    },
    checks: report.endpoints.map((result) => ({
      check: result.label,
      method: result.method,
      result: result.status === 'warn' ? 'warning' : result.status,
      required: result.required,
      classification: result.reasonCode,
      message: result.message,
      ...(typeof result.httpStatus === 'number' ? { httpStatus: result.httpStatus } : {}),
    })),
  }
}

export function serializeRedactedEnvironmentHealthReport(report: OidcPreflightReport): string {
  return JSON.stringify(buildRedactedEnvironmentHealthReport(report), null, 2)
}

/**
 * Optional endpoints that are not advertised are outside the scope of a
 * reachability check. Keep advertised optional endpoints (including invalid
 * URLs) so they can still surface actionable warnings.
 */
export function prepareEnvironmentHealthReport(report: OidcPreflightReport): OidcPreflightReport {
  const endpoints = report.endpoints.filter((result) => result.required || Boolean(result.url))
  const summary = endpoints.reduce(
    (counts, result) => {
      counts[result.status] += 1
      return counts
    },
    { pass: 0, warn: 0, fail: 0 }
  )

  return {
    ...report,
    summary,
    endpoints,
  }
}

function redactIssuer(value: string): string {
  try {
    const issuer = new URL(value)
    issuer.username = ''
    issuer.password = ''
    issuer.search = ''
    issuer.hash = ''
    return issuer.toString().replace(/\/$/, '')
  } catch {
    return '[invalid issuer]'
  }
}
