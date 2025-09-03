import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { PageContainer, PageHeader } from '@/components/page'
import { FileCog } from 'lucide-react'
import { JsonDisplay } from '@/components/common/JsonDisplay'
import { formatXml } from '@/lib/format/xml'

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default function SpMetadataGeneratorPage() {
  const [entityId, setEntityId] = useState('https://sp.example.com')
  const [acsUrl, setAcsUrl] = useState('https://sp.example.com/saml/acs')
  const [sloUrl, setSloUrl] = useState('')
  const [nameIdFormat, setNameIdFormat] = useState(
    'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
  )
  const [includeCert, setIncludeCert] = useState(false)
  const [x509, setX509] = useState('')

  const xml = useMemo(() => buildMetadata({ entityId, acsUrl, sloUrl, nameIdFormat, x509: includeCert ? x509 : '' }), [entityId, acsUrl, sloUrl, nameIdFormat, includeCert, x509])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(xml)
      toast.success('Metadata copied')
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <PageContainer maxWidth="5xl">
      <PageHeader
        title="SP Metadata Generator"
        description="Generate SAML SP metadata XML with ACS/SLO endpoints, NameID format, and optional signing certificate."
        icon={FileCog}
      />
      <Card>
        <CardContent className="p-5 grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm">entityID</label>
              <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">AssertionConsumerService (HTTP-POST)</label>
              <Input value={acsUrl} onChange={(e) => setAcsUrl(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">SingleLogoutService (optional)</label>
              <Input value={sloUrl} onChange={(e) => setSloUrl(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">NameIDFormat</label>
              <Input value={nameIdFormat} onChange={(e) => setNameIdFormat(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={includeCert} onCheckedChange={setIncludeCert} />
            <span className="text-sm">Include signing certificate</span>
          </div>
          {includeCert && (
            <div className="grid gap-2">
              <label className="text-sm">X.509 Certificate (base64, no PEM headers)</label>
              <Textarea
                value={x509}
                onChange={(e) => setX509(e.target.value)}
                rows={6}
                placeholder="MIIC..."
                className="font-mono"
              />
            </div>
          )}
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">Generated XML</div>
            <Button variant="outline" size="sm" onClick={copy}>Copy</Button>
          </div>
          <JsonDisplay data={formatXml(xml)} language="xml" maxHeight="420px" />
        </CardContent>
      </Card>
    </PageContainer>
  )
}

function buildMetadata(opts: {
  entityId: string
  acsUrl: string
  sloUrl?: string
  nameIdFormat: string
  x509?: string
}) {
  const parts: string[] = []
  parts.push(
    '<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"',
    ` entityID="${xmlEscape(opts.entityId)}">`
  )
  parts.push('<SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">')
  if (opts.x509 && opts.x509.trim()) {
    parts.push('<KeyDescriptor use="signing">')
    parts.push('<ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">')
    parts.push('<ds:X509Data>')
    parts.push(`<ds:X509Certificate>${opts.x509.trim()}</ds:X509Certificate>`) 
    parts.push('</ds:X509Data>')
    parts.push('</ds:KeyInfo>')
    parts.push('</KeyDescriptor>')
  }
  parts.push('<NameIDFormat>' + xmlEscape(opts.nameIdFormat) + '</NameIDFormat>')
  parts.push(
    `<AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${xmlEscape(
      opts.acsUrl
    )}" index="0" isDefault="true" />`
  )
  if (opts.sloUrl && opts.sloUrl.trim()) {
    parts.push(
      `<SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${xmlEscape(
        opts.sloUrl
      )}" />`
    )
  }
  parts.push('</SPSSODescriptor>')
  parts.push('</EntityDescriptor>')
  return parts.join('')
}
