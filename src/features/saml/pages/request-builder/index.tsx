import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  buildAuthnRequestXml,
  deflateRawToBase64,
  encodeBase64,
} from '@/features/saml/utils/saml-request'
import { signRedirectRequest, type RedirectSigAlg } from '@/features/saml/utils/redirect-signing'
import { PageContainer, PageHeader } from '@/components/page'
import { Hammer } from 'lucide-react'
import { JsonDisplay } from '@/components/common/JsonDisplay'
import { formatXml } from '@/lib/format/xml'

type Binding = 'HTTP-Redirect' | 'HTTP-POST'

export default function SamlRequestBuilderPage() {
  const [issuer, setIssuer] = useState('https://sp.example.com')
  const [destination, setDestination] = useState('https://idp.example.com/sso')
  // Helper: returns true for valid http(s) URLs
  function isValidHttpUrl(url: string) {
    try {
      const u = new URL(url)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }
  // Compute safe destination for use in form action and a validity flag
  const isDestinationValid = useMemo(() => isValidHttpUrl(destination), [destination])
  const destinationForForm = useMemo(
    () => (isDestinationValid ? destination : undefined),
    [isDestinationValid, destination]
  )
  const [acsUrl, setAcsUrl] = useState('https://sp.example.com/saml/acs')
  const [nameIdFormat, setNameIdFormat] = useState(
    'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
  )
  const [forceAuthn, setForceAuthn] = useState(false)
  const [relayState, setRelayState] = useState('')
  const [binding, setBinding] = useState<Binding>('HTTP-POST')
  const [requestId, setRequestId] = useState<string>('_' + crypto.randomUUID())
  const [isPassive, setIsPassive] = useState<'unset' | 'true' | 'false'>('unset')

  const xml = useMemo(
    () =>
      buildAuthnRequestXml({
        issuer,
        destination,
        acsUrl,
        nameIdFormat,
        forceAuthn,
        requestId,
        isPassive: isPassive === 'unset' ? undefined : isPassive === 'true',
      }),
    [issuer, destination, acsUrl, nameIdFormat, forceAuthn, requestId, isPassive]
  )

  const [redirectEncoded, setRedirectEncoded] = useState<string>('')
  const [postEncoded, setPostEncoded] = useState<string>('')
  const [redirectUrl, setRedirectUrl] = useState('')
  const [signedRedirectUrl, setSignedRedirectUrl] = useState('')

  // Signing
  const [enableSigning, setEnableSigning] = useState(false)
  const [sigAlg, setSigAlg] = useState<RedirectSigAlg>('rsa-sha256')
  const [privateKeyPem, setPrivateKeyPem] = useState('')

  useEffect(() => {
    // POST binding: base64 of raw XML
    setPostEncoded(encodeBase64(xml))

    // Redirect binding: DEFLATE (raw) + base64 + URL encode
    ;(async () => {
      try {
        const deflated = await deflateRawToBase64(xml)
        setRedirectEncoded(encodeURIComponent(deflated))
      } catch {
        setRedirectEncoded('')
      }
    })()
  }, [xml])

  useEffect(() => {
    if (!redirectEncoded) {
      setRedirectUrl('')
      return
    }
    const url = new URL(destination, window.location.origin)
    url.searchParams.set('SAMLRequest', redirectEncoded)
    if (relayState) url.searchParams.set('RelayState', relayState)
    setRedirectUrl(url.toString())
    setSignedRedirectUrl('')
  }, [destination, redirectEncoded, relayState])

  const copy = async (text: string, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(label)
    } catch {
      toast.error('Copy failed')
    }
  }

  const regenerateId = () => setRequestId('_' + crypto.randomUUID())

  const handleSignRedirect = async () => {
    try {
      if (!redirectEncoded) {
        toast.error('No encoded Redirect SAMLRequest available')
        return
      }
      if (!privateKeyPem.trim()) {
        toast.error('Private key (PKCS8 PEM) is required to sign')
        return
      }
      const baseUrl = new URL(destination, window.location.origin)
      const { url } = await signRedirectRequest({
        baseUrl: baseUrl.toString(),
        samlRequest: redirectEncoded,
        relayState: relayState || undefined,
        sigAlg,
        privateKeyPem,
      })
      setSignedRedirectUrl(url)
      toast.success('Redirect URL signed')
    } catch (e: any) {
      console.error(e)
      toast.error('Signing failed', { description: e?.message })
      setSignedRedirectUrl('')
    }
  }

  return (
    <PageContainer maxWidth="5xl">
      <PageHeader
        title="SAML AuthnRequest Builder"
        description="Build and launch SAML AuthnRequest messages for HTTP-POST and HTTP-Redirect bindings, with optional Redirect signing."
        icon={Hammer}
      />
      <Card className="min-w-0">
        <CardContent className="p-5 grid gap-4 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 min-w-0">
            <div className="grid gap-2 min-w-0">
              <label className="text-sm">Issuer (entityID)</label>
              <Input
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="grid gap-2 min-w-0">
              <label className="text-sm">Destination (IdP SSO URL)</label>
              <Input
                value={destination}
                onChange={(e) => {
                  // always allow user editing (so they can fix typos), but do no further processing here
                  setDestination(e.target.value)
                }}
                className="w-full"
              />
            </div>
            <div className="grid gap-2 min-w-0">
              <label className="text-sm">AssertionConsumerServiceURL</label>
              <Input
                value={acsUrl}
                onChange={(e) => setAcsUrl(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="grid gap-2 min-w-0">
              <label className="text-sm">NameIDFormat</label>
              <Select value={nameIdFormat} onValueChange={setNameIdFormat}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">
                    unspecified
                  </SelectItem>
                  <SelectItem value="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
                    emailAddress
                  </SelectItem>
                  <SelectItem value="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">
                    persistent
                  </SelectItem>
                  <SelectItem value="urn:oasis:names:tc:SAML:2.0:nameid-format:transient">
                    transient
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 min-w-0">
              <label className="text-sm">RelayState (optional)</label>
              <Input
                value={relayState}
                onChange={(e) => setRelayState(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="grid gap-2 min-w-0">
              <label className="text-sm">Binding</label>
              <Select value={binding} onValueChange={(v: Binding) => setBinding(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTTP-POST">HTTP-POST</SelectItem>
                  <SelectItem value="HTTP-Redirect">HTTP-Redirect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 min-w-0">
              <label className="text-sm">Request ID</label>
              <div className="flex gap-2">
                <Input
                  value={requestId}
                  onChange={(e) => setRequestId(e.target.value)}
                  className="w-full"
                />
                <Button variant="outline" onClick={regenerateId}>
                  New
                </Button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 items-center">
              <div className="flex items-center gap-2">
                <Switch checked={forceAuthn} onCheckedChange={setForceAuthn} />
                <span className="text-sm">ForceAuthn</span>
              </div>
              <div className="grid gap-2 min-w-0">
                <label className="text-sm">IsPassive</label>
                <Select
                  value={isPassive}
                  onValueChange={(v: 'unset' | 'true' | 'false') => setIsPassive(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Not included" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not included</SelectItem>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Tabs defaultValue="xml" className="min-w-0">
            <TabsList>
              <TabsTrigger value="xml">XML</TabsTrigger>
              <TabsTrigger value="encoded">Encoded</TabsTrigger>
              <TabsTrigger value="launch">Launch</TabsTrigger>
            </TabsList>
            <TabsContent value="xml" className="mt-3">
              <div className="flex justify-between mb-2">
                <div className="text-sm text-muted-foreground">Generated AuthnRequest XML</div>
              </div>
              <div className="min-w-0">
                <JsonDisplay data={formatXml(xml)} language="xml" maxHeight="420px" />
              </div>
            </TabsContent>
            <TabsContent value="encoded" className="mt-3">
              <div className="grid gap-4 min-w-0">
                <div>
                  <div className="flex justify-between mb-2">
                    <div className="text-sm">HTTP-POST: Base64 SAMLRequest</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copy(postEncoded, 'Base64 copied')}
                    >
                      Copy
                    </Button>
                  </div>
                  <div className="min-w-0">
                    <JsonDisplay data={postEncoded} language="text" maxHeight="200px" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <div className="text-sm">
                      HTTP-Redirect: URL-encoded(deflate+base64) SAMLRequest
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copy(redirectEncoded, 'Encoded copied')}
                      disabled={!redirectEncoded}
                    >
                      Copy
                    </Button>
                  </div>
                  {!redirectEncoded && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                      Redirect encoding unavailable in this browser (missing CompressionStream). Use
                      POST binding or try a Chromium-based browser.
                    </div>
                  )}
                  <div className="min-w-0">
                    <JsonDisplay data={redirectEncoded} language="text" maxHeight="200px" />
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="launch" className="mt-3">
              <div className="grid gap-3 min-w-0">
                <div className="text-sm text-muted-foreground">Launch AuthnRequest</div>
                {binding === 'HTTP-Redirect' ? (
                  <div className="grid gap-2">
                    <div className="min-w-0">
                      <JsonDisplay data={redirectUrl} language="text" maxHeight="120px" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => window.open(redirectUrl, '_blank')}
                        disabled={!redirectUrl}
                      >
                        Open Redirect URL
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => copy(redirectUrl, 'URL copied')}
                        disabled={!redirectUrl}
                      >
                        Copy URL
                      </Button>
                    </div>

                    <div className="mt-4 border-t pt-4 grid gap-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={enableSigning} onCheckedChange={setEnableSigning} />
                        <span className="text-sm">Sign Redirect (adds Signature)</span>
                      </div>
                      {enableSigning && (
                        <>
                          <div className="grid md:grid-cols-2 gap-2 items-center">
                            <div className="grid gap-1">
                              <label className="text-sm">SigAlg</label>
                              <select
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                value={sigAlg}
                                onChange={(e) => setSigAlg(e.target.value as RedirectSigAlg)}
                              >
                                <option value="rsa-sha256">RSA-SHA256</option>
                                {/* Future: ecdsa-sha256 */}
                              </select>
                            </div>
                          </div>
                          <div className="grid gap-2 min-w-0">
                            <label className="text-sm">Private Key (PKCS8 PEM)</label>
                            <Textarea
                              value={privateKeyPem}
                              onChange={(e) => setPrivateKeyPem(e.target.value)}
                              rows={8}
                              placeholder={
                                '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----'
                              }
                              className="font-mono w-full"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSignRedirect} disabled={!redirectUrl}>
                              Sign URL
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => copy(privateKeyPem, 'Key copied')}
                              disabled={!privateKeyPem.trim()}
                            >
                              Copy Key
                            </Button>
                          </div>
                          <div className="grid gap-2 min-w-0">
                            <label className="text-sm">Signed Redirect URL</label>
                            <JsonDisplay
                              data={signedRedirectUrl}
                              language="text"
                              maxHeight="120px"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => window.open(signedRedirectUrl, '_blank')}
                                disabled={!signedRedirectUrl}
                              >
                                Open Signed URL
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => copy(signedRedirectUrl, 'Signed URL copied')}
                                disabled={!signedRedirectUrl}
                              >
                                Copy Signed URL
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <form
                    method="post"
                    action={destinationForForm}
                    onSubmit={(e) => {
                      if (!isDestinationValid) {
                        e.preventDefault()
                      }
                    }}
                    target="_blank"
                    className="grid gap-2 min-w-0"
                  >
                    <input type="hidden" name="SAMLRequest" value={postEncoded} />
                    {relayState && <input type="hidden" name="RelayState" value={relayState} />}
                    <div className="text-xs text-muted-foreground">
                      Submits via HTTP-POST to the IdP
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={!isDestinationValid}>
                        Submit POST to IdP
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => copy(postEncoded, 'SAMLRequest copied')}
                      >
                        Copy POST SAMLRequest
                        {!isDestinationValid && (
                          <div className="text-xs text-red-600 mt-1">
                            Invalid Destination URL. Please enter a valid https:// or http:// URL.
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
