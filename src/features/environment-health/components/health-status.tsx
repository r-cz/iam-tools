import {
  CircleCheck,
  CircleHelp,
  CircleX,
  LoaderCircle,
  TriangleAlert,
  WifiOff,
} from 'lucide-react'
import type { OidcPreflightReport } from '@/features/oauthPlayground/utils/oidc-preflight'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type EnvironmentHealthRunState = 'idle' | 'running' | 'completed' | 'unavailable' | 'error'

interface HealthStatusProps {
  state: EnvironmentHealthRunState
  report: OidcPreflightReport | null
  errorMessage?: string
}

const statusCopy: Record<
  Exclude<EnvironmentHealthRunState, 'completed'>,
  { title: string; description: string }
> = {
  idle: {
    title: 'Ready to check',
    description: 'Choose an environment or enter an issuer, then run a health check.',
  },
  running: {
    title: 'Running checks',
    description: 'Resolving discovery metadata and probing advertised endpoints…',
  },
  unavailable: {
    title: 'Health is unavailable',
    description:
      'The browser reports that it is offline. Endpoint reachability is unknown, not failed.',
  },
  error: {
    title: 'Check could not run',
    description: 'Review the issuer URL and try the health check again.',
  },
}

function CompletedIcon({ report }: { report: OidcPreflightReport }) {
  if (report.summary.fail > 0) {
    return <CircleX className="size-7 text-red-600 dark:text-red-400" aria-hidden="true" />
  }

  if (report.summary.warn > 0) {
    return (
      <TriangleAlert className="size-7 text-amber-600 dark:text-amber-400" aria-hidden="true" />
    )
  }

  return <CircleCheck className="size-7 text-green-700 dark:text-green-400" aria-hidden="true" />
}

function StateIcon({ state }: { state: Exclude<EnvironmentHealthRunState, 'completed'> }) {
  switch (state) {
    case 'running':
      return (
        <LoaderCircle
          className="size-7 animate-spin text-foreground"
          aria-hidden="true"
          data-testid="environment-health-running-icon"
        />
      )
    case 'unavailable':
      return <WifiOff className="size-7 text-muted-foreground" aria-hidden="true" />
    case 'error':
      return <CircleX className="size-7 text-red-600 dark:text-red-400" aria-hidden="true" />
    default:
      return <CircleHelp className="size-7 text-muted-foreground" aria-hidden="true" />
  }
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  className,
  testId,
}: {
  icon: typeof CircleCheck
  label: string
  value: number
  className: string
  testId: string
}) {
  return (
    <div className="flex items-center gap-2" data-testid={testId}>
      <Icon className={cn('size-4', className)} aria-hidden="true" />
      <span className="font-medium tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}

export function HealthStatus({ state, report, errorMessage }: HealthStatusProps) {
  const isCompleted = state === 'completed' && report !== null
  const copy = isCompleted ? null : statusCopy[state === 'completed' ? 'idle' : state]

  return (
    <Card
      className="gap-0 py-0"
      data-testid="environment-health-status"
      data-state={state}
      aria-live="polite"
      role={state === 'error' ? 'alert' : 'status'}
    >
      <CardContent className="flex min-h-18 flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          {isCompleted ? (
            <CompletedIcon report={report} />
          ) : (
            <StateIcon state={state === 'completed' ? 'idle' : state} />
          )}
          <div className="min-w-0">
            <p className="font-semibold">{isCompleted ? 'Checks complete' : copy?.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isCompleted
                ? `Generated ${new Date(report.generatedAt).toLocaleString()}`
                : errorMessage || copy?.description}
            </p>
          </div>
        </div>

        {isCompleted ? (
          <div
            className="grid grid-cols-3 gap-x-5 gap-y-2 text-sm sm:flex sm:gap-7"
            data-testid="environment-health-summary"
          >
            <SummaryItem
              icon={CircleCheck}
              label="pass"
              value={report.summary.pass}
              className="text-green-700 dark:text-green-400"
              testId="environment-health-summary-pass"
            />
            <SummaryItem
              icon={TriangleAlert}
              label="warning"
              value={report.summary.warn}
              className="text-amber-600 dark:text-amber-400"
              testId="environment-health-summary-warning"
            />
            <SummaryItem
              icon={CircleX}
              label="fail"
              value={report.summary.fail}
              className={
                report.summary.fail > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
              }
              testId="environment-health-summary-fail"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
