import { useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ClipboardCopy,
  Info,
  LoaderCircle,
  Play,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageContainer, PageHeader } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClipboard } from '@/hooks/use-clipboard'
import { useEnvironmentProfiles, type EnvironmentProfile } from '@/lib/state'
import {
  runOidcEndpointPreflight,
  type OidcPreflightReport,
} from '@/features/oauthPlayground/utils/oidc-preflight'
import { HealthResults } from './components/health-results'
import { HealthStatus, type EnvironmentHealthRunState } from './components/health-status'
import {
  HEALTH_REPORT_DISCLAIMER,
  prepareEnvironmentHealthReport,
  serializeRedactedEnvironmentHealthReport,
} from './report'

const CUSTOM_ENVIRONMENT = '__custom_environment__'

type HealthRun =
  | { status: 'idle' }
  | { status: 'running'; id: number; issuer: string }
  | { status: 'completed'; id: number; issuer: string; report: OidcPreflightReport }
  | { status: 'unavailable'; id: number; issuer: string }
  | { status: 'error'; id: number; issuer: string; message: string }

export interface EnvironmentHealthPageProps {
  preflightRunner?: typeof runOidcEndpointPreflight
  isOnline?: () => boolean
}

function browserIsOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

function profileLabel(profile: EnvironmentProfile): string {
  try {
    return `${profile.name} (${new URL(profile.issuerUrl).host})`
  } catch {
    return profile.name
  }
}

function reportIndicatesNetworkUnavailable(report: OidcPreflightReport): boolean {
  const discovery = report.endpoints[0]
  if (report.endpoints.length !== 1 || discovery?.endpoint !== 'discovery') {
    return false
  }

  return discovery.reasonCode === 'network_or_cors' || hasNetworkFailureText(discovery.error)
}

function errorIndicatesNetworkUnavailable(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true
  }

  return (
    error instanceof Error &&
    (error.name === 'AbortError' ||
      error.name === 'TimeoutError' ||
      hasNetworkFailureText(error.message))
  )
}

function hasNetworkFailureText(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /(failed to fetch|network|cors|load failed|timed? ?out|timeout|offline|aborted)/i.test(value)
  )
}

export default function EnvironmentHealthPage({
  preflightRunner = runOidcEndpointPreflight,
  isOnline = browserIsOnline,
}: EnvironmentHealthPageProps) {
  const { profiles } = useEnvironmentProfiles()
  const initialProfile = profiles[0]
  const [selectedEnvironment, setSelectedEnvironment] = useState(
    initialProfile?.id ?? CUSTOM_ENVIRONMENT
  )
  const [issuerUrl, setIssuerUrl] = useState(initialProfile?.issuerUrl ?? '')
  const [run, setRun] = useState<HealthRun>({ status: 'idle' })
  const runIdRef = useRef(0)
  const [copiedReport, setCopiedReport] = useState<OidcPreflightReport | null>(null)
  const { copy, copied } = useClipboard()
  const runState: EnvironmentHealthRunState = run.status
  const report = run.status === 'completed' ? run.report : null
  const errorMessage = run.status === 'error' ? run.message : undefined

  const redactedReport = useMemo(
    () => (report ? serializeRedactedEnvironmentHealthReport(report) : ''),
    [report]
  )

  const resetResults = () => {
    runIdRef.current++
    setCopiedReport(null)
    setRun({ status: 'idle' })
  }

  const handleEnvironmentChange = (profileId: string) => {
    setSelectedEnvironment(profileId)
    if (profileId === CUSTOM_ENVIRONMENT) {
      setIssuerUrl('')
    } else {
      const profile = profiles.find((candidate) => candidate.id === profileId)
      setIssuerUrl(profile?.issuerUrl ?? '')
    }
    resetResults()
  }

  const handleIssuerChange = (value: string) => {
    setIssuerUrl(value)
    setSelectedEnvironment(CUSTOM_ENVIRONMENT)
    resetResults()
  }

  const handleRun = async () => {
    setCopiedReport(null)
    const id = ++runIdRef.current
    const submittedIssuer = issuerUrl.trim()

    if (!submittedIssuer) {
      setRun({
        status: 'error',
        id,
        issuer: submittedIssuer,
        message: 'Enter an issuer URL before running the health check.',
      })
      return
    }

    setRun({ status: 'running', id, issuer: submittedIssuer })

    try {
      const nextReport = await preflightRunner({
        issuerUrl: submittedIssuer,
        requiredEndpoints: ['authorization_endpoint', 'token_endpoint', 'jwks_uri'],
        includeOptionalEndpoints: true,
        enableServerAssistedProbes: false,
      })

      if (runIdRef.current !== id) return
      if (!isOnline() && reportIndicatesNetworkUnavailable(nextReport)) {
        setRun({ status: 'unavailable', id, issuer: submittedIssuer })
        return
      }

      setRun({
        status: 'completed',
        id,
        issuer: submittedIssuer,
        report: prepareEnvironmentHealthReport(nextReport),
      })
    } catch (error) {
      if (runIdRef.current !== id) return
      if (!isOnline() && errorIndicatesNetworkUnavailable(error)) {
        setRun({ status: 'unavailable', id, issuer: submittedIssuer })
      } else {
        setRun({
          status: 'error',
          id,
          issuer: submittedIssuer,
          message:
            'The check stopped before it produced a report. Confirm the issuer URL and try again.',
        })
      }
    }
  }

  const handleCopy = async () => {
    if (!report || !redactedReport) return

    const reportToCopy = report
    const copiedSuccessfully = await copy(redactedReport)
    if (copiedSuccessfully) {
      setCopiedReport(reportToCopy)
      toast.success('Redacted health report copied')
    } else {
      toast.error('Could not copy the health report')
    }
  }

  const isRunning = runState === 'running'
  const currentReportCopied = copied && report !== null && copiedReport === report

  return (
    <PageContainer maxWidth="full">
      <div data-testid="environment-health-page">
        <PageHeader
          title="Environment Health"
          description="Check OIDC discovery and endpoint reachability for a saved environment or issuer."
          icon={ShieldCheck}
        />

        <div className="space-y-5">
          <Card className="gap-0 py-0" data-testid="environment-health-controls">
            <CardContent className="px-5 py-4">
              <form
                noValidate
                className="grid items-end gap-4 lg:grid-cols-[minmax(13rem,0.9fr)_minmax(18rem,1.2fr)_auto_auto]"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleRun()
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="environment-health-environment">Environment</Label>
                  <div className="relative">
                    <select
                      id="environment-health-environment"
                      value={selectedEnvironment}
                      onChange={(event) => handleEnvironmentChange(event.target.value)}
                      disabled={isRunning}
                      className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full appearance-none rounded-md border bg-background px-3 pr-9 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                      data-testid="environment-health-environment-select"
                    >
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profileLabel(profile)}
                        </option>
                      ))}
                      <option value={CUSTOM_ENVIRONMENT}>Custom issuer</option>
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="environment-health-issuer">Issuer URL</Label>
                  <Input
                    id="environment-health-issuer"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    placeholder="https://login.example.com"
                    value={issuerUrl}
                    onChange={(event) => handleIssuerChange(event.target.value)}
                    disabled={isRunning}
                    className="h-10"
                    aria-describedby="environment-health-safety-note"
                    data-testid="environment-health-issuer-input"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="h-10 gap-2 px-5"
                  disabled={isRunning}
                  data-testid="environment-health-run-button"
                >
                  {isRunning ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Play className="size-4 fill-current" aria-hidden="true" />
                  )}
                  {isRunning ? 'Running checks…' : 'Run health check'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-10 gap-2 px-5"
                  onClick={() => void handleCopy()}
                  disabled={!report || isRunning}
                  data-testid="environment-health-copy-button"
                >
                  {currentReportCopied ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <ClipboardCopy className="size-4" aria-hidden="true" />
                  )}
                  {currentReportCopied ? 'Report copied' : 'Copy report'}
                </Button>
              </form>

              <p
                id="environment-health-safety-note"
                className="mt-4 flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  Only endpoints on the exact issuer origin you enter are probed. Cross-origin and
                  credential-bearing endpoints advertised by discovery are reported without a
                  request. {HEALTH_REPORT_DISCLAIMER}
                </span>
              </p>
            </CardContent>
          </Card>

          <HealthStatus state={runState} report={report} errorMessage={errorMessage} />

          {report ? <HealthResults key={report.generatedAt} report={report} /> : null}

          <details
            open
            className="group rounded-xl border bg-card px-5 py-4 text-card-foreground shadow-sm"
            data-testid="environment-health-explanation"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 font-semibold marker:hidden">
              <Info className="size-4 shrink-0" aria-hidden="true" />
              <span>What this checks</span>
              <ChevronDown
                className="ml-auto size-4 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-2 pl-7 text-sm leading-6 text-muted-foreground">
              We fetch the OIDC discovery document from the issuer and check the presence and
              reachability of required endpoints such as authorization, token, and JWKS. Optional
              endpoints are checked when advertised. Results reflect network reachability and basic
              protocol responses only. CORS and browser constraints can make a healthy endpoint
              unavailable to a browser probe. Cross-origin discovered targets are reported without
              sending a browser or server-assisted request.
            </p>
          </details>
        </div>
      </div>
    </PageContainer>
  )
}
