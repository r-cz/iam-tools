import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { proxyFetch } from '@/lib/proxy-fetch'
import { toast } from 'sonner'
import { verifySamlMetadataSignature } from '@/features/saml/utils/signature-verify'
import { PageContainer, PageHeader } from '@/components/page'
import { BadgeCheck } from 'lucide-react'
import { JsonDisplay } from '@/components/common/JsonDisplay'
import { formatXml } from '@/lib/format/xml'

type ParsedKey = {
  use?: string
  x509?: string
}

type ParsedSso = {
  binding: string
  location: string
}

export default function SamlMetadataValidatorPage() {
  const [url, setUrl] = useState('')
  const [xml, setXml] = useState('')
  const [parsingError, setParsingError] = useState<string | null>(null)
  const [certPem, setCertPem] = useState('')
  const [verifyResult, setVerifyResult] = useState<null | {
    present: boolean
    valid: boolean | null
    error?: string
  }>(null)

  const fetchMetadata = async () => {
    if (!url) return
    try {
      const resp = await proxyFetch(url)
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`)
      const text = await resp.text()
      setXml(text)
      setParsingError(null)
      toast.success('Metadata fetched')
    } catch (e: any) {
      toast.error('Fetch failed', { description: e?.message })
    }
  }

  const parsed = useMemo(() => parseMetadata(xml), [xml])

  const onVerify = async () => {
    try {
      const res = await verifySamlMetadataSignature(xml, certPem)
      setVerifyResult(res)
      if (res.present && res.valid) toast.success('Metadata signature is valid')
      else if (res.present && res.valid === false) toast.error('Invalid metadata signature')
      else toast.info('No signature element found in metadata')
    } catch (e: any) {
      setVerifyResult({ present: true, valid: false, error: e?.message })
      toast.error('Verification failed', { description: e?.message })
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
              <label className="text-sm">Metadata URL</label>
              <Input
                placeholder="https://idp.example.com/FederationMetadata/2007-06/FederationMetadata.xml"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <Button onClick={fetchMetadata}>Fetch</Button>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Metadata XML</label>
            <Textarea
              value={xml}
              onChange={(e) => setXml(e.target.value)}
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

          {parsingError && <div className="text-sm text-red-600">{parsingError}</div>}

          {parsed && (
            <div className="grid gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Entity</div>
                <div className="text-sm">
                  entityID: <span className="font-mono">{parsed.entityId || '—'}</span>
                </div>
                <div className="text-sm">IDP Present: {parsed.hasIdp ? 'Yes' : 'No'}</div>
                <div className="text-sm">SP Present: {parsed.hasSp ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">SingleSignOnService</div>
                <ul className="text-sm list-disc pl-5">
                  {parsed.sso.map((s, i) => (
                    <li key={i}>
                      <span className="font-mono">{s.binding}</span> →{' '}
                      <span className="font-mono">{s.location}</span>
                    </li>
                  ))}
                  {parsed.sso.length === 0 && <li>None</li>}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">SingleLogoutService</div>
                <ul className="text-sm list-disc pl-5">
                  {parsed.slo.map((s, i) => (
                    <li key={i}>
                      <span className="font-mono">{s.binding}</span> →{' '}
                      <span className="font-mono">{s.location}</span>
                    </li>
                  ))}
                  {parsed.slo.length === 0 && <li>None</li>}
                </ul>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Keys</div>
                <ul className="text-sm list-disc pl-5 break-all">
                  {parsed.keys.map((k, i) => (
                    <li key={i}>
                      use: <span className="font-mono">{k.use || '—'}</span>
                      {k.x509 && (
                        <>
                          {' '}
                          | x509 len: <span className="font-mono">{k.x509.length}</span>
                        </>
                      )}
                    </li>
                  ))}
                  {parsed.keys.length === 0 && <li>None</li>}
                </ul>
              </div>

              <div>
                <div className="text-sm font-medium mb-1">Checks</div>
                <ul className="text-sm list-disc pl-5">
                  {parsed.warnings.length === 0 && <li>No obvious issues found</li>}
                  {parsed.warnings.map((w, i) => (
                    <li key={i} className="text-amber-700 dark:text-amber-400">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium">Verify Metadata Signature</div>
                <Textarea
                  rows={6}
                  placeholder={'-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----'}
                  value={certPem}
                  onChange={(e) => setCertPem(e.target.value)}
                  className="font-mono"
                />
                <div className="flex gap-2">
                  <Button onClick={onVerify} disabled={!xml.trim() || !certPem.trim()}>
                    Verify
                  </Button>
                  {verifyResult && (
                    <span className="text-sm">
                      Result:{' '}
                      {verifyResult.present
                        ? verifyResult.valid
                          ? 'Valid'
                          : 'Invalid'
                        : 'No signature'}
                      {verifyResult.error ? ` — ${verifyResult.error}` : ''}
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

function parseMetadata(xml: string): {
  entityId?: string
  hasIdp: boolean
  hasSp: boolean
  sso: ParsedSso[]
  slo: ParsedSso[]
  keys: ParsedKey[]
  warnings: string[]
} | null {
  if (!xml.trim()) return null
  try {
    const safeXml = sanitizeXmlInput(xml)
    const doc = new DOMParser().parseFromString(safeXml, 'application/xml')
    const parserError = doc.getElementsByTagName('parsererror')[0]
    if (parserError) throw new Error('XML parse error')

    const $ = (q: string) => Array.from(doc.getElementsByTagName(q))
    const entity = $('EntityDescriptor')[0]
    const entityId = entity?.getAttribute('entityID') ?? undefined

    const idp = $('IDPSSODescriptor')[0]
    const sp = $('SPSSODescriptor')[0]

    const toServices = (nodes: Element[], tag: string): ParsedSso[] =>
      nodes
        .flatMap((n) => Array.from(n.getElementsByTagName(tag)))
        .map((n) => ({
          binding: n.getAttribute('Binding') || '',
          location: n.getAttribute('Location') || '',
        }))

    const sso = toServices([idp].filter(Boolean) as Element[], 'SingleSignOnService')
    const slo = toServices([idp, sp].filter(Boolean) as Element[], 'SingleLogoutService')

    const keys: ParsedKey[] = Array.from(doc.getElementsByTagName('KeyDescriptor')).map((kd) => {
      const use = kd.getAttribute('use') || undefined
      const x509 = kd.getElementsByTagName('X509Certificate')[0]?.textContent || undefined
      return { use, x509 }
    })

    const warnings: string[] = []
    if (!entityId) warnings.push('Missing entityID')
    if (!idp && !sp) warnings.push('No IDPSSODescriptor or SPSSODescriptor found')
    if (idp && sso.length === 0) warnings.push('IDPSSODescriptor missing SingleSignOnService')
    if (keys.length === 0) warnings.push('No signing/encryption keys present')

    const validUntil = entity?.getAttribute('validUntil') || undefined
    if (validUntil) {
      const parsedDate = new Date(validUntil)
      if (Number.isNaN(parsedDate.getTime())) {
        warnings.push('validUntil is not a valid date')
      } else {
        const msRemaining = parsedDate.getTime() - Date.now()
        if (msRemaining <= 0) {
          warnings.push('Metadata validUntil has expired')
        } else if (msRemaining < 1000 * 60 * 60 * 24 * 30) {
          warnings.push('Metadata validUntil expires within 30 days')
        }
      }
    }

    const signingKeys = keys.filter((key) => !key.use || key.use === 'signing')
    if (signingKeys.length > 1) {
      warnings.push('Multiple signing keys detected; ensure your SP/IdP supports key rollover')
    }
    if (keys.some((key) => !key.use)) {
      warnings.push('KeyDescriptor entries without a use attribute should be reviewed')
    }

    return { entityId, hasIdp: !!idp, hasSp: !!sp, sso, slo, keys, warnings }
  } catch {
    return {
      entityId: undefined,
      hasIdp: false,
      hasSp: false,
      sso: [],
      slo: [],
      keys: [],
      warnings: ['Failed to parse metadata'],
    }
  }
}

/**
 * Basic XML sanitizer: removes <!DOCTYPE ...>, <!ENTITY ...>, and trims leading/trailing whitespace.
 * Only allows parsing if the root tag is EntityDescriptor (SAML metadata).
 */
function sanitizeXmlInput(xml: string): string {
  // Remove DOCTYPE declarations
  let cleaned = xml.replace(/<!DOCTYPE[\s\S]*?>/gi, '')
  // Remove ENTITY declarations
  cleaned = cleaned.replace(/<!ENTITY[\s\S]*?>/gi, '')
  // Trim whitespace
  cleaned = cleaned.trim()
  // Optionally: enforce root tag (can be customized for SAML metadata)
  if (!/^<\s*EntityDescriptor[\s>]/.test(cleaned)) {
    throw new Error('Invalid SAML metadata XML: Root element must be EntityDescriptor')
  }
  return cleaned
}
