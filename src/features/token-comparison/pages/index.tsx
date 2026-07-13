import { useMemo, useState } from 'react'
import {
  ArrowRightLeft,
  Braces,
  Eye,
  EyeOff,
  GitCompareArrows,
  Info,
  ShieldCheck,
  Sparkles,
  Trash2,
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
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
  compareTokens,
  createExampleComparisonTokens,
  decodeTokenForComparison,
  type ClaimDifference,
  type DifferenceKind,
  type TokenMetadata,
} from '../utils/token-comparison'

const STATUS_VARIANTS: Record<DifferenceKind, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    changed: 'default',
    added: 'secondary',
    removed: 'destructive',
    unchanged: 'outline',
  }

function formatValue(value: unknown): string {
  if (value === undefined) return '—'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function formatTimestamp(value?: number): string {
  return value === undefined ? 'Not present' : new Date(value * 1000).toLocaleString()
}

function formatDuration(value?: number): string {
  if (value === undefined) return 'Not available'
  const sign = value < 0 ? '−' : ''
  const total = Math.abs(value)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return `${sign}${hours ? `${hours}h ` : ''}${minutes ? `${minutes}m ` : ''}${seconds}s`.trim()
}

function ValueCell({ value, difference }: { value: unknown; difference: ClaimDifference }) {
  const values = Array.isArray(value)
    ? new Set(value.filter((item) => typeof item === 'string'))
    : null

  return (
    <TableCell className="max-w-[22rem] whitespace-normal align-top">
      <code className="break-all text-xs whitespace-pre-wrap">{formatValue(value)}</code>
      {values && (difference.addedValues?.length || difference.removedValues?.length) ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {difference.addedValues
            ?.filter((item) => values.has(item))
            .map((item) => (
              <Badge key={`added-${item}`} variant="secondary">
                + {item}
              </Badge>
            ))}
          {difference.removedValues
            ?.filter((item) => values.has(item))
            .map((item) => (
              <Badge key={`removed-${item}`} variant="destructive">
                − {item}
              </Badge>
            ))}
        </div>
      ) : null}
    </TableCell>
  )
}

function MetadataColumn({ label, metadata }: { label: string; metadata: TokenMetadata }) {
  return (
    <Item>
      <ItemContent className="min-w-0">
        <ItemTitle>{label}</ItemTitle>
        <ItemDescription className="break-all">
          Issuer: {metadata.issuer ?? 'Not present'}
        </ItemDescription>
        <ItemDescription className="break-all">
          Subject: {metadata.subject ?? 'Not present'}
        </ItemDescription>
        <ItemDescription>Issued: {formatTimestamp(metadata.issuedAt)}</ItemDescription>
        <ItemDescription>Expires: {formatTimestamp(metadata.expiresAt)}</ItemDescription>
        <ItemDescription>Lifetime: {formatDuration(metadata.lifetimeSeconds)}</ItemDescription>
      </ItemContent>
    </Item>
  )
}

export default function TokenComparisonPage() {
  const [leftToken, setLeftToken] = useState('')
  const [rightToken, setRightToken] = useState('')
  const [showUnchanged, setShowUnchanged] = useState(false)

  const leftDecode = useMemo(
    () => (leftToken.trim() ? decodeTokenForComparison(leftToken) : null),
    [leftToken]
  )
  const rightDecode = useMemo(
    () => (rightToken.trim() ? decodeTokenForComparison(rightToken) : null),
    [rightToken]
  )
  const comparison = useMemo(() => {
    if (!leftDecode?.ok || !rightDecode?.ok) return null
    return compareTokens(leftToken, rightToken)
  }, [leftDecode, leftToken, rightDecode, rightToken])

  const visibleDifferences = useMemo(
    () =>
      comparison?.differences.filter(
        (difference) => showUnchanged || difference.kind !== 'unchanged'
      ) ?? [],
    [comparison, showUnchanged]
  )

  const report = useMemo(
    () =>
      comparison
        ? JSON.stringify(
            {
              warning: 'Decoded comparison only; signatures were not verified.',
              counts: comparison.counts,
              metadata: comparison.metadata,
              differences: comparison.differences.filter((item) => item.kind !== 'unchanged'),
            },
            null,
            2
          )
        : '',
    [comparison]
  )

  const loadExample = () => {
    const example = createExampleComparisonTokens()
    setLeftToken(example.left)
    setRightToken(example.right)
  }

  const swapTokens = () => {
    setLeftToken(rightToken)
    setRightToken(leftToken)
  }

  const clearTokens = () => {
    setLeftToken('')
    setRightToken('')
    setShowUnchanged(false)
  }

  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="Token Claims Diff"
        description="Compare two JWTs side by side to pinpoint claim, scope, role, audience, and lifetime differences."
        icon={GitCompareArrows}
      />

      <div className="flex flex-col gap-6" data-testid="token-comparison-root">
        <Alert>
          <ShieldCheck />
          <AlertTitle>Local, ephemeral comparison</AlertTitle>
          <AlertDescription>
            This tool does not persist either token or send it over the network. Decoding is not
            cryptographic verification; use Token Inspector when trust matters.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Tokens to compare</CardTitle>
            <CardDescription>
              Paste compact JWTs from two environments, clients, sessions, or points in time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-5 lg:grid-cols-2">
              <Field data-invalid={Boolean(leftDecode && !leftDecode.ok)}>
                <FieldLabel htmlFor="token-comparison-left">Token A</FieldLabel>
                <Textarea
                  id="token-comparison-left"
                  value={leftToken}
                  onChange={(event) => setLeftToken(event.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="min-h-44 font-mono text-xs"
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={Boolean(leftDecode && !leftDecode.ok)}
                  data-testid="token-comparison-left"
                />
                <FieldDescription>Baseline or expected token.</FieldDescription>
                {leftDecode && !leftDecode.ok ? <FieldError>{leftDecode.error}</FieldError> : null}
              </Field>

              <Field data-invalid={Boolean(rightDecode && !rightDecode.ok)}>
                <FieldLabel htmlFor="token-comparison-right">Token B</FieldLabel>
                <Textarea
                  id="token-comparison-right"
                  value={rightToken}
                  onChange={(event) => setRightToken(event.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="min-h-44 font-mono text-xs"
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={Boolean(rightDecode && !rightDecode.ok)}
                  data-testid="token-comparison-right"
                />
                <FieldDescription>Observed or changed token.</FieldDescription>
                {rightDecode && !rightDecode.ok ? (
                  <FieldError>{rightDecode.error}</FieldError>
                ) : null}
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Button onClick={loadExample} data-testid="token-comparison-example">
              <Sparkles data-icon="inline-start" />
              Load example
            </Button>
            <Button variant="outline" onClick={swapTokens} disabled={!leftToken && !rightToken}>
              <ArrowRightLeft data-icon="inline-start" />
              Swap
            </Button>
            <Button variant="ghost" onClick={clearTokens} disabled={!leftToken && !rightToken}>
              <Trash2 data-icon="inline-start" />
              Clear
            </Button>
          </CardFooter>
        </Card>

        {comparison ? (
          <>
            <ItemGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(['changed', 'added', 'removed', 'unchanged'] as const).map((kind) => (
                <Item key={kind}>
                  <ItemContent>
                    <ItemTitle className="capitalize">{kind}</ItemTitle>
                    <ItemDescription>{comparison.counts[kind]} claim paths</ItemDescription>
                  </ItemContent>
                  <Badge variant={STATUS_VARIANTS[kind]}>{comparison.counts[kind]}</Badge>
                </Item>
              ))}
            </ItemGroup>

            <Card>
              <CardHeader>
                <CardTitle>Token timing and identity</CardTitle>
                <CardDescription>
                  Token B was issued {formatDuration(comparison.metadata.issuedAtDeltaSeconds)} from
                  Token A and its lifetime changed by{' '}
                  {formatDuration(comparison.metadata.lifetimeDeltaSeconds)}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ItemGroup className="grid gap-3 lg:grid-cols-2">
                  <MetadataColumn label="Token A" metadata={comparison.metadata.left} />
                  <MetadataColumn label="Token B" metadata={comparison.metadata.right} />
                </ItemGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1.5">
                    <CardTitle>Claim differences</CardTitle>
                    <CardDescription>
                      Set-like claims are order-insensitive and show their added or removed values.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-pressed={showUnchanged}
                      onClick={() => setShowUnchanged((current) => !current)}
                    >
                      {showUnchanged ? (
                        <EyeOff data-icon="inline-start" />
                      ) : (
                        <Eye data-icon="inline-start" />
                      )}
                      {showUnchanged ? 'Hide unchanged' : 'Show unchanged'}
                    </Button>
                    <CopyButton text={report} copiedText="Report copied" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Path</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Token A</TableHead>
                      <TableHead>Token B</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleDifferences.map((difference) => (
                      <TableRow key={`${difference.section}-${difference.path}`}>
                        <TableCell className="whitespace-normal align-top">
                          <Badge variant="outline" className="mb-2">
                            {difference.section}
                          </Badge>
                          <div className="font-mono text-xs break-all">{difference.path}</div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant={STATUS_VARIANTS[difference.kind]}>
                            {difference.kind}
                          </Badge>
                        </TableCell>
                        <ValueCell value={difference.left} difference={difference} />
                        <ValueCell value={difference.right} difference={difference} />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Alert>
              <Info />
              <AlertTitle>What this comparison does not prove</AlertTitle>
              <AlertDescription>
                Matching claims do not prove the tokens are authentic, intended for this app, or
                safe to accept. Verify signatures, issuer, audience, and policy separately.
              </AlertDescription>
            </Alert>
          </>
        ) : (
          <Empty>
            <EmptyMedia variant="icon">
              <Braces />
            </EmptyMedia>
            <EmptyTitle>Paste two JWTs to begin</EmptyTitle>
            <EmptyDescription>
              Load the safe example to see audience, scope, role, custom-claim, and timing drift.
            </EmptyDescription>
          </Empty>
        )}
      </div>
    </PageContainer>
  )
}
