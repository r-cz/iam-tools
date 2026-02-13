import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormFieldInput } from '@/components/common'
import { JsonDisplay } from '@/components/common/JsonDisplay'
import { CopyButton } from '@/components/common/CopyButton'
import type { OidcConfiguration } from '@/features/oidcExplorer/utils/types'
import {
  OidcEndpointName,
  OidcEndpointPreflightResult,
  OidcPreflightReport,
  runOidcEndpointPreflight,
} from '../utils/oidc-preflight'

interface EndpointPreflightPanelProps {
  issuerUrl: string
  onIssuerUrlChange: (value: string) => void
  requiredEndpoints?: OidcEndpointName[]
  onConfigResolved?: (config: OidcConfiguration, normalizedIssuerUrl: string) => void
  preflightRunner?: typeof runOidcEndpointPreflight
  autoRunTrigger?: string | number
  onReport?: (report: OidcPreflightReport) => void
  title?: string
  description?: string
  showIssuerInput?: boolean
}

function getStatusVariant(status: OidcEndpointPreflightResult['status']) {
  switch (status) {
    case 'pass':
      return 'bg-green-500/15 text-green-700 dark:text-green-300'
    case 'warn':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
    default:
      return 'bg-red-500/15 text-red-700 dark:text-red-300'
  }
}

export function EndpointPreflightPanel({
  issuerUrl,
  onIssuerUrlChange,
  requiredEndpoints,
  onConfigResolved,
  preflightRunner = runOidcEndpointPreflight,
  autoRunTrigger,
  onReport,
  title = 'OIDC Endpoint Preflight',
  description = 'Check discovery and key endpoints before running OAuth flows.',
  showIssuerInput = true,
}: EndpointPreflightPanelProps) {
  const [report, setReport] = useState<OidcPreflightReport | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const lastAutoRunTriggerRef = useRef<string | number | undefined>(undefined)

  const summaryText = useMemo(() => {
    if (!report) return null
    const { pass, warn, fail } = report.summary
    return `pass ${pass} · warn ${warn} · fail ${fail}`
  }, [report])

  const runPreflight = useCallback(
    async (source: 'manual' | 'auto') => {
      if (!issuerUrl.trim()) {
        if (source === 'manual') {
          toast.error('Issuer URL is required for preflight')
        }
        return
      }

      setIsRunning(true)
      try {
        const preflightReport = await preflightRunner({
          issuerUrl,
          requiredEndpoints,
        })

        setReport(preflightReport)
        onReport?.(preflightReport)

        if (preflightReport.config && onConfigResolved) {
          onConfigResolved(preflightReport.config, preflightReport.normalizedIssuerUrl)
        }

        if (preflightReport.summary.fail > 0) {
          toast.error('Endpoint preflight finished with failures')
        } else if (preflightReport.summary.warn > 0) {
          toast.warning('Endpoint preflight finished with warnings')
        } else if (source === 'manual') {
          toast.success('Endpoint preflight passed')
        }
      } catch (error) {
        setReport(null)
        toast.error(
          error instanceof Error ? error.message : 'Failed to run endpoint preflight checks'
        )
      } finally {
        setIsRunning(false)
      }
    },
    [issuerUrl, onConfigResolved, onReport, preflightRunner, requiredEndpoints]
  )

  useEffect(() => {
    if (autoRunTrigger === undefined || autoRunTrigger === null) {
      return
    }

    if (lastAutoRunTriggerRef.current === autoRunTrigger) {
      return
    }

    lastAutoRunTriggerRef.current = autoRunTrigger
    void runPreflight('auto')
  }, [autoRunTrigger, runPreflight])

  return (
    <Card className="border-dashed" data-testid="oidc-preflight-panel">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showIssuerInput ? (
          <FormFieldInput
            id="oidc-preflight-issuer-url"
            label="Issuer URL"
            placeholder="https://example.com"
            value={issuerUrl}
            onChange={(event) => onIssuerUrlChange(event.target.value)}
            description="Used to resolve /.well-known/openid-configuration and probe endpoint reachability."
            data-testid="oidc-preflight-issuer-input"
          />
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void runPreflight('manual')
            }}
            disabled={isRunning}
            data-testid="oidc-preflight-run-button"
          >
            {isRunning ? 'Running preflight…' : 'Run Preflight'}
          </Button>
          {report && (
            <CopyButton
              text={JSON.stringify(report, null, 2)}
              variant="outline"
              size="sm"
              copiedText="Report copied"
            />
          )}
        </div>

        {report && (
          <div className="space-y-4" data-testid="oidc-preflight-report">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">
                Generated: {new Date(report.generatedAt).toLocaleString()}
              </Badge>
              {summaryText && <Badge variant="outline">{summaryText}</Badge>}
              <Badge variant="outline">Issuer: {report.normalizedIssuerUrl}</Badge>
            </div>

            <div className="space-y-2">
              {report.endpoints.map((result) => (
                <div
                  key={result.endpoint}
                  className="rounded-md border bg-muted/20 p-3"
                  data-testid={`oidc-preflight-result-${result.endpoint}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{result.label}</span>
                    <Badge variant="outline" className={getStatusVariant(result.status)}>
                      {result.status.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{result.method}</Badge>
                    <Badge variant="outline">{result.required ? 'Required' : 'Optional'}</Badge>
                    {typeof result.httpStatus === 'number' && (
                      <Badge variant="outline">HTTP {result.httpStatus}</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{result.message}</p>
                  {result.url && <p className="mt-1 break-all font-mono text-xs">{result.url}</p>}
                  {result.error && <p className="mt-1 text-xs text-destructive">{result.error}</p>}
                </div>
              ))}
            </div>

            <details
              className="rounded-md border bg-muted/10 p-3"
              data-testid="oidc-preflight-raw-report"
            >
              <summary className="cursor-pointer text-sm font-medium">Raw Report JSON</summary>
              <div className="mt-3">
                <JsonDisplay data={report} containerClassName="relative" maxHeight="320px" />
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EndpointPreflightPanel
