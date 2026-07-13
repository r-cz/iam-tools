import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Route,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/page'
import { CopyButton } from '@/components/common'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  analyzeRedirectUri,
  type RedirectFinding,
  type RedirectFindingLevel,
  type RedirectMatchType,
} from '../utils/redirect-uri'

const FINDING_ICON = {
  pass: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} satisfies Record<RedirectFindingLevel, typeof Info>

const FINDING_VARIANT: Record<
  RedirectFindingLevel,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pass: 'default',
  error: 'destructive',
  warning: 'secondary',
  info: 'outline',
}

const MATCH_LABEL: Record<RedirectMatchType, string> = {
  exact: 'Exact match',
  'loopback-port': 'Loopback port match',
  'normalized-only': 'Normalized only',
  none: 'No match',
  invalid: 'Invalid',
}

function FindingItem({ finding }: { finding: RedirectFinding }) {
  const Icon = FINDING_ICON[finding.level]

  return (
    <Item>
      <ItemMedia variant="icon">
        <Icon aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <div className="flex flex-wrap items-center gap-2">
          <ItemTitle>{finding.title}</ItemTitle>
          <Badge variant={FINDING_VARIANT[finding.level]}>{finding.level}</Badge>
        </div>
        <ItemDescription>{finding.message}</ItemDescription>
      </ItemContent>
    </Item>
  )
}

export default function RedirectUriDebuggerPage() {
  const [requestedUri, setRequestedUri] = useState('')
  const [registeredUris, setRegisteredUris] = useState('')

  const analysis = useMemo(
    () => (requestedUri.trim() ? analyzeRedirectUri(requestedUri, registeredUris) : null),
    [registeredUris, requestedUri]
  )
  const report = useMemo(() => (analysis ? JSON.stringify(analysis, null, 2) : ''), [analysis])

  const loadExample = () => {
    setRequestedUri('https://app.example.com/oauth/callback?tenant=acme')
    setRegisteredUris(
      [
        'https://app.example.com/oauth/callback?tenant=acme',
        'https://staging.example.com/oauth/callback',
        'http://127.0.0.1:49152/oauth/callback',
      ].join('\n')
    )
  }

  const clear = () => {
    setRequestedUri('')
    setRegisteredUris('')
  }

  return (
    <PageContainer>
      <PageHeader
        title="Redirect URI Debugger"
        description="Explain redirect matching failures and catch unsafe OAuth client registrations before deployment."
        icon={Route}
      />

      <div className="flex flex-col gap-6" data-testid="redirect-uri-debugger-root">
        <Alert>
          <ShieldCheck />
          <AlertTitle>Analysis only</AlertTitle>
          <AlertDescription>
            This tool never opens the redirect, sends an authorization response, or contacts the
            listed hosts. It compares strings and URI components locally.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Redirect under test</CardTitle>
            <CardDescription>
              Paste the requested value and the client&apos;s registered allowlist exactly as
              stored.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="redirect-uri-requested">Requested redirect URI</FieldLabel>
                <Input
                  id="redirect-uri-requested"
                  value={requestedUri}
                  onChange={(event) => setRequestedUri(event.target.value)}
                  placeholder="https://app.example.com/oauth/callback"
                  autoComplete="off"
                  spellCheck={false}
                  data-testid="redirect-uri-requested"
                />
                <FieldDescription>
                  The exact <code>redirect_uri</code> carried by the authorization request.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="redirect-uri-registered">Registered redirect URIs</FieldLabel>
                <Textarea
                  id="redirect-uri-registered"
                  value={registeredUris}
                  onChange={(event) => setRegisteredUris(event.target.value)}
                  placeholder={
                    'https://app.example.com/oauth/callback\ncom.example.app:/oauth/callback'
                  }
                  className="min-h-32 font-mono text-xs"
                  autoComplete="off"
                  spellCheck={false}
                  data-testid="redirect-uri-registered"
                />
                <FieldDescription>
                  One absolute URI per line. Empty lines are ignored.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Button onClick={loadExample} data-testid="redirect-uri-example">
              <Sparkles data-icon="inline-start" />
              Load safe example
            </Button>
            <Button variant="ghost" onClick={clear} disabled={!requestedUri && !registeredUris}>
              <Trash2 data-icon="inline-start" />
              Clear
            </Button>
          </CardFooter>
        </Card>

        {analysis ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1.5">
                    <CardTitle>
                      {analysis.safeToSend ? 'No blocking issue found' : 'Redirect needs attention'}
                    </CardTitle>
                    <CardDescription>
                      {analysis.matchedRegistration
                        ? `Matched registration: ${analysis.matchedRegistration}`
                        : 'No acceptable registration match was found.'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={analysis.safeToSend ? 'default' : 'destructive'}>
                      {MATCH_LABEL[analysis.matchType]}
                    </Badge>
                    <CopyButton text={report} copiedText="Report copied" />
                  </div>
                </div>
              </CardHeader>
              {analysis.parsed ? (
                <CardContent>
                  <ItemGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Item>
                      <ItemContent>
                        <ItemTitle>Scheme</ItemTitle>
                        <ItemDescription>{analysis.parsed.scheme}</ItemDescription>
                      </ItemContent>
                    </Item>
                    <Item>
                      <ItemContent>
                        <ItemTitle>Host</ItemTitle>
                        <ItemDescription className="break-all">
                          {analysis.parsed.host || 'No host'}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                    <Item>
                      <ItemContent>
                        <ItemTitle>Path</ItemTitle>
                        <ItemDescription className="break-all">
                          {analysis.parsed.path}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                    <Item>
                      <ItemContent>
                        <ItemTitle>Query</ItemTitle>
                        <ItemDescription className="break-all">
                          {analysis.parsed.query || 'None'}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                  </ItemGroup>
                </CardContent>
              ) : null}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Safety and matching checks</CardTitle>
                <CardDescription>
                  Errors are blocking; warnings identify deployment-specific risk to review.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ItemGroup className="grid gap-3 md:grid-cols-2">
                  {analysis.findings.map((finding) => (
                    <FindingItem key={finding.code} finding={finding} />
                  ))}
                </ItemGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Registration-by-registration result</CardTitle>
                <CardDescription>
                  Web redirects require exact comparison; native loopback IP redirects may use a
                  dynamic port.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis.registrations.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Registered URI</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Explanation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.registrations.map((registration) => (
                        <TableRow key={registration.uri}>
                          <TableCell className="max-w-72 whitespace-normal font-mono text-xs break-all">
                            {registration.uri}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                registration.matchType === 'exact' ||
                                registration.matchType === 'loopback-port'
                                  ? 'default'
                                  : registration.matchType === 'invalid'
                                    ? 'destructive'
                                    : 'outline'
                              }
                            >
                              {MATCH_LABEL[registration.matchType]}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-normal">{registration.detail}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Alert>
                    <Info />
                    <AlertTitle>Add the registration allowlist</AlertTitle>
                    <AlertDescription>
                      URI structure checks are available, but matching cannot be evaluated yet.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Empty>
            <EmptyMedia variant="icon">
              <Route />
            </EmptyMedia>
            <EmptyTitle>Enter a redirect URI</EmptyTitle>
            <EmptyDescription>
              The debugger checks exact registration matching, fragments, transport, custom schemes,
              query retention, loopback exceptions, and wildcard risk.
            </EmptyDescription>
          </Empty>
        )}
      </div>
    </PageContainer>
  )
}
