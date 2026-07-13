import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/components/ui/item'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTotpCodes } from '@/features/totp/hooks/use-totp-codes'
import {
  generateBase32Secret,
  normalizeBase32,
  parseOtpauthUri,
  verifyTotp,
  type OtpauthTotpConfig,
  type TotpAlgorithm,
  type TotpVerificationResult,
} from '@/features/totp/utils'

interface ResolvedInput {
  secret?: string
  parsed?: OtpauthTotpConfig
  error?: string
}

interface StoredVerification {
  key: string
  result: TotpVerificationResult
}

interface VerificationKeyInput {
  secret: string
  algorithm: TotpAlgorithm
  digits: number
  period: number
  candidateCode: string
  driftWindow: number
  step: number | null
}

export function buildTotpVerificationKey({
  secret,
  algorithm,
  digits,
  period,
  candidateCode,
  driftWindow,
  step,
}: VerificationKeyInput): string {
  return JSON.stringify([secret, algorithm, digits, period, candidateCode, driftWindow, step])
}

function resolveSecretInput(input: string): ResolvedInput {
  if (!input.trim()) return {}
  try {
    if (input.trim().toLowerCase().startsWith('otpauth://')) {
      const parsed = parseOtpauthUri(input)
      return { secret: parsed.secret, parsed }
    }
    return { secret: normalizeBase32(input) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid TOTP input.' }
  }
}

export default function TotpDebuggerPage() {
  const [secretInput, setSecretInput] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [algorithm, setAlgorithm] = useState<TotpAlgorithm>('SHA1')
  const [digits, setDigits] = useState(6)
  const [period, setPeriod] = useState(30)
  const [candidateCode, setCandidateCode] = useState('')
  const [driftWindow, setDriftWindow] = useState(1)
  const [verification, setVerification] = useState<StoredVerification | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const resolved = useMemo(() => resolveSecretInput(secretInput), [secretInput])
  const effectiveAlgorithm = resolved.parsed?.algorithm ?? algorithm
  const effectiveDigits = resolved.parsed?.digits ?? digits
  const effectivePeriod = resolved.parsed?.period ?? period
  const codes = useTotpCodes({
    secret: resolved.secret,
    algorithm: effectiveAlgorithm,
    digits: effectiveDigits,
    period: effectivePeriod,
  })
  const verificationKey = buildTotpVerificationKey({
    secret: resolved.secret ?? '',
    algorithm: effectiveAlgorithm,
    digits: effectiveDigits,
    period: effectivePeriod,
    candidateCode,
    driftWindow,
    step: codes?.step ?? null,
  })
  const visibleVerification = verification?.key === verificationKey ? verification.result : null

  const loadExample = () => {
    setSecretInput('JBSWY3DPEHPK3PXP')
    setAlgorithm('SHA1')
    setDigits(6)
    setPeriod(30)
    setCandidateCode('')
    setVerification(null)
  }

  const generateSecret = () => {
    setSecretInput(generateBase32Secret())
    setCandidateCode('')
    setVerification(null)
  }

  const clear = () => {
    setSecretInput('')
    setCandidateCode('')
    setVerification(null)
    setShowSecret(false)
  }

  const verifyCandidate = async () => {
    if (!resolved.secret || !codes) return
    setIsVerifying(true)
    try {
      const result = await verifyTotp(candidateCode, resolved.secret, {
        algorithm: effectiveAlgorithm,
        digits: effectiveDigits,
        period: effectivePeriod,
        driftWindow,
        timestamp: codes.step * effectivePeriod,
      })
      setVerification({ key: verificationKey, result })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="TOTP Debugger"
        description="Generate RFC 6238 codes, inspect otpauth settings, and identify time-step drift without exposing the shared secret."
        icon={Clock3}
      />

      <div className="flex flex-col gap-6" data-testid="totp-debugger-root">
        <Alert>
          <ShieldCheck />
          <AlertTitle>Secret-safe by design</AlertTitle>
          <AlertDescription>
            Seeds are processed only in memory, never persisted, logged, placed in a URL, or sent
            over the network. Use test credentials whenever possible.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Authenticator configuration</CardTitle>
            <CardDescription>
              Paste a Base32 secret or a complete <code>otpauth://totp</code> URI. URI parameters
              override the manual algorithm, digits, and period controls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={Boolean(resolved.error)}>
                <FieldLabel htmlFor="totp-secret-input">Base32 secret or otpauth URI</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="totp-secret-input"
                    type={showSecret ? 'text' : 'password'}
                    value={secretInput}
                    onChange={(event) => setSecretInput(event.target.value)}
                    placeholder="JBSWY3DPEHPK3PXP"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(resolved.error)}
                    data-testid="totp-secret-input"
                  />
                  <InputGroupAddon align="inline-end" className="p-0">
                    <InputGroupButton
                      size="icon"
                      aria-label={showSecret ? 'Hide TOTP secret' : 'Show TOTP secret'}
                      onClick={() => setShowSecret((current) => !current)}
                    >
                      {showSecret ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldDescription>
                  Whitespace in Base32 is ignored. The field remains masked unless you reveal it.
                </FieldDescription>
                {resolved.error ? <FieldError>{resolved.error}</FieldError> : null}
              </Field>

              <div className="grid gap-5 sm:grid-cols-3">
                <Field data-disabled={Boolean(resolved.parsed)}>
                  <FieldLabel htmlFor="totp-algorithm">Algorithm</FieldLabel>
                  <Select
                    value={effectiveAlgorithm}
                    onValueChange={(value) => setAlgorithm(value as TotpAlgorithm)}
                    disabled={Boolean(resolved.parsed)}
                  >
                    <SelectTrigger id="totp-algorithm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="SHA1">SHA-1</SelectItem>
                        <SelectItem value="SHA256">SHA-256</SelectItem>
                        <SelectItem value="SHA512">SHA-512</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <Field data-disabled={Boolean(resolved.parsed)}>
                  <FieldLabel htmlFor="totp-digits">Digits</FieldLabel>
                  {resolved.parsed ? (
                    <>
                      <Input
                        id="totp-digits"
                        value={`${effectiveDigits} digit${effectiveDigits === 1 ? '' : 's'}`}
                        readOnly
                        aria-readonly="true"
                        className="bg-muted"
                        data-testid="totp-effective-digits"
                      />
                      <FieldDescription>Read from the otpauth URI.</FieldDescription>
                    </>
                  ) : (
                    <Select
                      value={String(effectiveDigits)}
                      onValueChange={(value) => setDigits(Number(value))}
                    >
                      <SelectTrigger id="totp-digits" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="6">6 digits</SelectItem>
                          <SelectItem value="8">8 digits</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </Field>

                <Field data-disabled={Boolean(resolved.parsed)}>
                  <FieldLabel htmlFor="totp-period">Period</FieldLabel>
                  {resolved.parsed ? (
                    <>
                      <Input
                        id="totp-period"
                        value={`${effectivePeriod} second${effectivePeriod === 1 ? '' : 's'}`}
                        readOnly
                        aria-readonly="true"
                        className="bg-muted"
                        data-testid="totp-effective-period"
                      />
                      <FieldDescription>Read from the otpauth URI.</FieldDescription>
                    </>
                  ) : (
                    <Select
                      value={String(effectivePeriod)}
                      onValueChange={(value) => setPeriod(Number(value))}
                    >
                      <SelectTrigger id="totp-period" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="30">30 seconds</SelectItem>
                          <SelectItem value="60">60 seconds</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-wrap gap-2">
            <Button onClick={loadExample} data-testid="totp-example">
              <Sparkles data-icon="inline-start" />
              Load test secret
            </Button>
            <Button variant="outline" onClick={generateSecret}>
              <RefreshCw data-icon="inline-start" />
              Generate random secret
            </Button>
            <Button variant="ghost" onClick={clear} disabled={!secretInput}>
              <Trash2 data-icon="inline-start" />
              Clear
            </Button>
          </CardFooter>
        </Card>

        {resolved.parsed ? (
          <ItemGroup className="grid gap-3 sm:grid-cols-2">
            <Item>
              <ItemContent>
                <ItemTitle>Issuer</ItemTitle>
                <ItemDescription>{resolved.parsed.issuer ?? 'Not supplied'}</ItemDescription>
              </ItemContent>
            </Item>
            <Item>
              <ItemContent>
                <ItemTitle>Account</ItemTitle>
                <ItemDescription className="break-all">
                  {resolved.parsed.accountName}
                </ItemDescription>
              </ItemContent>
            </Item>
          </ItemGroup>
        ) : null}

        {resolved.secret && codes && !codes.error ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1.5">
                    <CardTitle>Current code</CardTitle>
                    <CardDescription>
                      {effectiveAlgorithm} · {effectiveDigits} digits · {effectivePeriod}-second
                      period
                    </CardDescription>
                  </div>
                  <CopyButton text={codes.current} copiedText="Code copied" />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div
                  className="text-center font-mono text-4xl font-semibold tracking-[0.3em] sm:text-5xl"
                  data-testid="totp-current-code"
                >
                  {codes.current}
                </div>
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel htmlFor="totp-period-progress">Time remaining</FieldLabel>
                    <span className="text-sm text-muted-foreground">{codes.secondsRemaining}s</span>
                  </div>
                  <Progress
                    id="totp-period-progress"
                    value={(codes.secondsRemaining / effectivePeriod) * 100}
                    aria-label={`${codes.secondsRemaining} seconds remaining`}
                  />
                </Field>
              </CardContent>
            </Card>

            <ItemGroup className="grid gap-3 sm:grid-cols-3">
              <Item>
                <ItemContent>
                  <ItemTitle>Previous window</ItemTitle>
                  <ItemDescription className="font-mono text-lg tracking-widest">
                    {codes.previous}
                  </ItemDescription>
                </ItemContent>
                <Badge variant="outline">−1</Badge>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>Current window</ItemTitle>
                  <ItemDescription className="font-mono text-lg tracking-widest">
                    {codes.current}
                  </ItemDescription>
                </ItemContent>
                <Badge>0</Badge>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>Next window</ItemTitle>
                  <ItemDescription className="font-mono text-lg tracking-widest">
                    {codes.next}
                  </ItemDescription>
                </ItemContent>
                <Badge variant="outline">+1</Badge>
              </Item>
            </ItemGroup>

            <Card>
              <CardHeader>
                <CardTitle>Verify a candidate code</CardTitle>
                <CardDescription>
                  Search adjacent time steps to distinguish a bad code from clock drift.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup className="grid gap-5 sm:grid-cols-[1fr_12rem]">
                  <Field>
                    <FieldLabel htmlFor="totp-candidate-code">Candidate code</FieldLabel>
                    <Input
                      id="totp-candidate-code"
                      value={candidateCode}
                      onChange={(event) => setCandidateCode(event.target.value.replace(/\D/g, ''))}
                      inputMode="numeric"
                      maxLength={effectiveDigits}
                      placeholder={'0'.repeat(effectiveDigits)}
                      className="font-mono tracking-widest"
                      data-testid="totp-candidate-code"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="totp-drift-window">Drift window</FieldLabel>
                    <Select
                      value={String(driftWindow)}
                      onValueChange={(value) => setDriftWindow(Number(value))}
                    >
                      <SelectTrigger id="totp-drift-window" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="0">Current only</SelectItem>
                          <SelectItem value="1">±1 step</SelectItem>
                          <SelectItem value="2">±2 steps</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter className="flex-wrap gap-3">
                <Button
                  onClick={verifyCandidate}
                  disabled={candidateCode.length !== effectiveDigits || isVerifying}
                  data-testid="totp-verify"
                >
                  <KeyRound data-icon="inline-start" />
                  Verify code
                </Button>
                {visibleVerification ? (
                  <Badge variant={visibleVerification.valid ? 'default' : 'destructive'}>
                    {visibleVerification.valid
                      ? `Valid at step ${visibleVerification.delta === 0 ? '0' : visibleVerification.delta}`
                      : 'No match in window'}
                  </Badge>
                ) : null}
              </CardFooter>
            </Card>

            {visibleVerification ? (
              <Alert variant={visibleVerification.valid ? 'default' : 'destructive'}>
                {visibleVerification.valid ? <CheckCircle2 /> : <XCircle />}
                <AlertTitle>
                  {visibleVerification.valid ? 'Candidate verified' : 'Candidate rejected'}
                </AlertTitle>
                <AlertDescription>
                  {visibleVerification.valid
                    ? visibleVerification.delta === 0
                      ? 'The code matches the current time step.'
                      : `The code matches time-step offset ${visibleVerification.delta}. Check clock synchronization.`
                    : `No code matched within ±${driftWindow} time step${driftWindow === 1 ? '' : 's'}.`}
                </AlertDescription>
              </Alert>
            ) : null}
          </>
        ) : resolved.secret && codes?.error ? (
          <Alert variant="destructive">
            <XCircle />
            <AlertTitle>Unable to generate codes</AlertTitle>
            <AlertDescription>{codes.error}</AlertDescription>
          </Alert>
        ) : (
          <Empty>
            <EmptyMedia variant="icon">
              <Clock3 />
            </EmptyMedia>
            <EmptyTitle>Add a TOTP test secret</EmptyTitle>
            <EmptyDescription>
              Load the non-production example to see current and adjacent codes, countdown timing,
              otpauth parsing, and drift-aware verification.
            </EmptyDescription>
          </Empty>
        )}
      </div>
    </PageContainer>
  )
}
