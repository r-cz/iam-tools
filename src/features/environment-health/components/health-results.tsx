import { Fragment, useState } from 'react'
import { ChevronDown, CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import type {
  OidcEndpointPreflightResult,
  OidcPreflightReport,
} from '@/features/oauthPlayground/utils/oidc-preflight'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface HealthResultsProps {
  report: OidcPreflightReport
}

function statusPresentation(status: OidcEndpointPreflightResult['status']) {
  switch (status) {
    case 'pass':
      return {
        label: 'Pass',
        icon: CircleCheck,
        iconClassName: 'text-green-700 dark:text-green-400',
        badgeClassName:
          'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300',
      }
    case 'warn':
      return {
        label: 'Warning',
        icon: TriangleAlert,
        iconClassName: 'text-amber-600 dark:text-amber-400',
        badgeClassName:
          'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
      }
    default:
      return {
        label: 'Fail',
        icon: CircleX,
        iconClassName: 'text-red-600 dark:text-red-400',
        badgeClassName:
          'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300',
      }
  }
}

function ResultBadge({ result }: { result: OidcEndpointPreflightResult }) {
  const presentation = statusPresentation(result.status)
  const Icon = presentation.icon

  return (
    <div className="flex items-center gap-2">
      <Icon className={cn('size-4 shrink-0', presentation.iconClassName)} aria-hidden="true" />
      <Badge variant="outline" className={presentation.badgeClassName}>
        {presentation.label}
      </Badge>
    </div>
  )
}

function ExpandButton({
  result,
  expanded,
  onToggle,
  surface,
}: {
  result: OidcEndpointPreflightResult
  expanded: boolean
  onToggle: () => void
  surface: 'desktop' | 'mobile'
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={`environment-health-details-${result.endpoint}-${surface}`}
      aria-label={`${expanded ? 'Hide' : 'Show'} details for ${result.label}`}
      data-testid={`environment-health-expand-${result.endpoint}-${surface}`}
    >
      <ChevronDown
        className={cn('size-4 transition-transform', expanded && 'rotate-180')}
        aria-hidden="true"
      />
    </Button>
  )
}

function ResultDetails({
  result,
  id,
  className,
}: {
  result: OidcEndpointPreflightResult
  id: string
  className?: string
}) {
  return (
    <div id={id} className={cn('space-y-3 text-sm', className)}>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Method
          </dt>
          <dd className="mt-1 font-mono text-xs">{result.method}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Requirement
          </dt>
          <dd className="mt-1">{result.required ? 'Required' : 'Optional'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Classification
          </dt>
          <dd className="mt-1">{result.reasonCode.replaceAll('_', ' ')}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            HTTP status
          </dt>
          <dd className="mt-1">
            {typeof result.httpStatus === 'number' ? result.httpStatus : 'Not available'}
          </dd>
        </div>
      </dl>
      {result.url ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Endpoint
          </p>
          <p className="mt-1 break-all font-mono text-xs">{formatSafeEndpointUrl(result.url)}</p>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Raw provider errors are withheld because they can include sensitive response data.
      </p>
    </div>
  )
}

export function HealthResults({ report }: HealthResultsProps) {
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null)

  const toggleEndpoint = (endpoint: string) => {
    setExpandedEndpoint((current) => (current === endpoint ? null : endpoint))
  }

  return (
    <Card className="gap-0 overflow-hidden py-0" data-testid="environment-health-results">
      <CardContent className="px-0">
        <div className="hidden md:block">
          <Table>
            <caption className="sr-only">OIDC discovery and endpoint health check results</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Check</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Expand</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.endpoints.map((result) => {
                const expanded = expandedEndpoint === result.endpoint

                return (
                  <Fragment key={result.endpoint}>
                    <TableRow data-testid={`environment-health-result-${result.endpoint}`}>
                      <TableCell className="pl-5 font-medium">{result.label}</TableCell>
                      <TableCell className="max-w-72 truncate font-mono text-xs text-muted-foreground">
                        {result.url ? formatEndpoint(result.url) : 'Not advertised'}
                      </TableCell>
                      <TableCell>
                        <ResultBadge result={result} />
                      </TableCell>
                      <TableCell className="max-w-80 truncate text-muted-foreground">
                        {result.message}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <ExpandButton
                          result={result}
                          expanded={expanded}
                          onToggle={() => toggleEndpoint(result.endpoint)}
                          surface="desktop"
                        />
                      </TableCell>
                    </TableRow>
                    {expanded ? (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={5} className="px-5 py-4 whitespace-normal">
                          <ResultDetails
                            result={result}
                            id={`environment-health-details-${result.endpoint}-desktop`}
                          />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <ul className="divide-y md:hidden" aria-label="Environment health results">
          {report.endpoints.map((result) => {
            const expanded = expandedEndpoint === result.endpoint

            return (
              <li
                key={result.endpoint}
                className="px-4 py-4"
                data-testid={`environment-health-result-mobile-${result.endpoint}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <p className="font-medium">{result.label}</p>
                    <ResultBadge result={result} />
                    <p className="break-all font-mono text-xs text-muted-foreground">
                      {result.url ? formatEndpoint(result.url) : 'Not advertised'}
                    </p>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                  <ExpandButton
                    result={result}
                    expanded={expanded}
                    onToggle={() => toggleEndpoint(result.endpoint)}
                    surface="mobile"
                  />
                </div>
                {expanded ? (
                  <ResultDetails
                    result={result}
                    id={`environment-health-details-${result.endpoint}-mobile`}
                    className="mt-4 border-t pt-4"
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

function formatEndpoint(value: string): string {
  try {
    const endpoint = new URL(value)
    return endpoint.pathname
  } catch {
    return '[invalid endpoint URL]'
  }
}

function formatSafeEndpointUrl(value: string): string {
  try {
    const endpoint = new URL(value)
    endpoint.username = ''
    endpoint.password = ''
    endpoint.search = ''
    endpoint.hash = ''
    return endpoint.toString()
  } catch {
    return '[invalid endpoint URL]'
  }
}
