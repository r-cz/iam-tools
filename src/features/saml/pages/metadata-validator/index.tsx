import { useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { proxyFetch } from '@/lib/proxy-fetch'
import { toast } from 'sonner'
import {
  verifySamlMetadataSignature,
  type SignatureVerificationOutcome,
} from '@/features/saml/utils/signature-verify'
import { PageContainer, PageHeader } from '@/components/page'
import { BadgeCheck } from 'lucide-react'
import { JsonDisplay } from '@/components/common/JsonDisplay'
import { formatXml } from '@/lib/format/xml'
import { parseSamlMetadata } from '@/features/saml/utils/metadata-parser'

type FetchState = { status: 'idle' } | { status: 'running'; url: string }
type VerifyState =
  | { status: 'idle' }
  | { status: 'running'; key: string }
  | { status: 'complete'; key: string; result: SignatureVerificationOutcome }

export default function SamlMetadataValidatorPage() {
  const [url, setUrl] = useState('')
  const [xml, setXml] = useState('')
  const [certPem, setCertPem] = useState('')
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' })
  const [verifyState, setVerifyState] = useState<VerifyState>({ status: 'idle' })
  const fetchGeneration = useRef(0)
  const verifyGeneration = useRef(0)
  const verificationKey = `${xml}\u0000${certPem}`

  const fetchMetadata = async () => {
    if (!url) return
    const requestedUrl = url
    const generation = ++fetchGeneration.current
    setFetchState({ status: 'running', url: requestedUrl })
    try {
      const resp = await proxyFetch(requestedUrl)
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`)
      const text = await resp.text()
      if (fetchGeneration.current !== generation) return
      verifyGeneration.current += 1
      setXml(text)
      setFetchState({ status: 'idle' })
      toast.success('Metadata fetched')
    } catch (error) {
      if (fetchGeneration.current !== generation) return
      setFetchState({ status: 'idle' })
      toast.error('Fetch failed', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const parsed = useMemo(() => parseSamlMetadata(xml), [xml])
  const verifyResult =
    verifyState.status === 'complete' && verifyState.key === verificationKey
      ? verifyState.result
      : null
  const isVerifying = verifyState.status === 'running' && verifyState.key === verificationKey

  const onVerify = async () => {
    const key = verificationKey
    const generation = ++verifyGeneration.current
    setVerifyState({ status: 'running', key })
    try {
      const res = await verifySamlMetadataSignature(xml, certPem)
      if (verifyGeneration.current !== generation) return
      setVerifyState({ status: 'complete', key, result: res })
      if (res.status === 'valid') toast.success('Metadata signature is valid')
      else if (res.status === 'invalid') toast.error('Invalid metadata signature')
      else if (res.status === 'error')
        toast.error('Verification failed', { description: res.message })
      else toast.info('No signature element found in metadata')
    } catch (error) {
      if (verifyGeneration.current !== generation) return
      const message = error instanceof Error ? error.message : 'Verification failed'
      setVerifyState({ status: 'complete', key, result: { status: 'error', message } })
      toast.error('Verification failed', { description: message })
    }
  }

  return (
    <PageContainer maxWidth="5xl">
      <PageHeader
        title="SAML Metadata Validator"
        description="Fetch, inspect, and verify SAML metadata signatures. Paste a URL or XML, view services and keys, and validate against a certificate."
        icon={BadgeCheck}
      />
      <Card>
        <CardContent className="p-5 grid gap-4">
          <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
            <div className="grid gap-2 min-w-0">
              <Label htmlFor="metadata-url" className="text-sm">
                Metadata URL
              </Label>
              <Input
                id="metadata-url"
                placeholder="https://idp.example.com/FederationMetadata/2007-06/FederationMetadata.xml"
                value={url}
                onChange={(e) => {
                  fetchGeneration.current += 1
                  setUrl(e.target.value)
                }}
              />
            </div>
            <Button
              onClick={fetchMetadata}
              disabled={!url.trim() || fetchState.status === 'running'}
            >
              {fetchState.status === 'running' ? 'Fetching…' : 'Fetch'}
            </Button>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="metadata-xml" className="text-sm">
              Metadata XML
            </Label>
            <Textarea
              id="metadata-xml"
              value={xml}
              onChange={(e) => {
                verifyGeneration.current += 1
                setXml(e.target.value)
              }}
              rows={10}
              className="font-mono"
            />
            {xml.trim() && (
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-1">Preview</div>
                <JsonDisplay data={formatXml(xml)} language="xml" maxHeight="360px" />
              </div>
            )}
          </div>

          {parsed.status === 'invalid' && (
            <div className="text-sm text-red-600">{parsed.message}</div>
          )}

          {parsed.status === 'valid' && (
            <div className="grid gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Entity</div>
                <div className="text-sm">
                  entityID: <span className="font-mono">{parsed.value.entityId || '—'}</span>
                </div>
                <div className="text-sm">IDP Present: {parsed.value.hasIdp ? 'Yes' : 'No'}</div>
                <div className="text-sm">SP Present: {parsed.value.hasSp ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">SingleSignOnService</div>
                <ul className="text-sm list-disc pl-5">
                  {parsed.value.sso.map((s) => (
                    <li key={`${s.binding}-${s.location}`}>
                      <span className="font-mono">{s.binding}</span> →{' '}
                      <span className="font-mono">{s.location}</span>
                    </li>
                  ))}
                  {parsed.value.sso.length === 0 && <li>None</li>}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">SingleLogoutService</div>
                <ul className="text-sm list-disc pl-5">
                  {parsed.value.slo.map((s) => (
                    <li key={`${s.binding}-${s.location}`}>
                      <span className="font-mono">{s.binding}</span> →{' '}
                      <span className="font-mono">{s.location}</span>
                    </li>
                  ))}
                  {parsed.value.slo.length === 0 && <li>None</li>}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Keys</div>
                <ul className="text-sm list-disc pl-5 break-all">
                  {parsed.value.keys.map((k) => (
                    <li key={`${k.use ?? 'none'}-${k.x509 ?? 'none'}`}>
                      use: <span className="font-mono">{k.use || '—'}</span>
                      {k.x509 && (
                        <>
                          {' '}
                          | x509 len: <span className="font-mono">{k.x509.length}</span>
                        </>
                      )}
                    </li>
                  ))}
                  {parsed.value.keys.length === 0 && <li>None</li>}
                </ul>
              </div>

              <div>
                <div className="text-sm font-medium mb-1">Checks</div>
                <ul className="text-sm list-disc pl-5">
                  {parsed.value.warnings.length === 0 && <li>No obvious issues found</li>}
                  {parsed.value.warnings.map((w) => (
                    <li key={w} className="text-amber-700 dark:text-amber-400">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium">Verify Metadata Signature</div>
                <Textarea
                  id="metadata-cert-pem"
                  rows={6}
                  placeholder={'-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----'}
                  value={certPem}
                  onChange={(e) => {
                    verifyGeneration.current += 1
                    setCertPem(e.target.value)
                  }}
                  className="font-mono"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={onVerify}
                    disabled={!xml.trim() || !certPem.trim() || isVerifying}
                  >
                    {isVerifying ? 'Verifying…' : 'Verify'}
                  </Button>
                  {verifyResult && (
                    <span className="text-sm">
                      Result: {formatVerificationOutcome(verifyResult)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  )
}

function formatVerificationOutcome(result: SignatureVerificationOutcome): string {
  switch (result.status) {
    case 'unsigned':
      return 'No signature'
    case 'valid':
      return 'Valid'
    case 'invalid':
      return 'Invalid'
    case 'error':
      return `Error — ${result.message}`
  }
}
