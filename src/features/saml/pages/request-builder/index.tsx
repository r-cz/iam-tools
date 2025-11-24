import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageContainer, PageHeader } from '@/components/page'
import { Hammer } from 'lucide-react'
import { JsonDisplay } from '@/components/common/JsonDisplay'
import { formatXml } from '@/lib/format/xml'
import { useSamlRequestBuilder } from '@/features/saml/hooks/useSamlRequestBuilder'
import { RequestFormFields } from '@/features/saml/components/RequestFormFields'
import { LaunchTab } from '@/features/saml/components/LaunchTab'

export default function SamlRequestBuilderPage() {
  const {
    issuer,
    destination,
    acsUrl,
    nameIdFormat,
    forceAuthn,
    relayState,
    binding,
    requestId,
    isPassive,
    xml,
    redirectEncoded,
    postEncoded,
    redirectUrl,
    isDestinationValid,
    destinationForForm,
    enableSigning,
    sigAlg,
    privateKeyPem,
    signedRedirectUrl,
    setIssuer,
    setDestination,
    setAcsUrl,
    setNameIdFormat,
    setForceAuthn,
    setRelayState,
    setBinding,
    setRequestId,
    setIsPassive,
    setEnableSigning,
    setSigAlg,
    setPrivateKeyPem,
    regenerateId,
    copy,
    handleSignRedirect,
  } = useSamlRequestBuilder()

  return (
    <PageContainer maxWidth="5xl">
      <PageHeader
        title="SAML AuthnRequest Builder"
        description="Build and launch SAML AuthnRequest messages for HTTP-POST and HTTP-Redirect bindings, with optional Redirect signing."
        icon={Hammer}
      />
      <Card className="min-w-0">
        <CardContent className="p-5 grid gap-4 min-w-0">
          <RequestFormFields
            issuer={issuer}
            destination={destination}
            acsUrl={acsUrl}
            nameIdFormat={nameIdFormat}
            relayState={relayState}
            binding={binding}
            requestId={requestId}
            forceAuthn={forceAuthn}
            isPassive={isPassive}
            onIssuerChange={setIssuer}
            onDestinationChange={setDestination}
            onAcsUrlChange={setAcsUrl}
            onNameIdFormatChange={setNameIdFormat}
            onRelayStateChange={setRelayState}
            onBindingChange={setBinding}
            onRequestIdChange={setRequestId}
            onForceAuthnChange={setForceAuthn}
            onIsPassiveChange={setIsPassive}
            onRegenerateId={regenerateId}
          />

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
              <LaunchTab
                binding={binding}
                redirectUrl={redirectUrl}
                postEncoded={postEncoded}
                relayState={relayState}
                isDestinationValid={isDestinationValid}
                destinationForForm={destinationForForm}
                enableSigning={enableSigning}
                sigAlg={sigAlg}
                privateKeyPem={privateKeyPem}
                signedRedirectUrl={signedRedirectUrl}
                onEnableSigningChange={setEnableSigning}
                onSigAlgChange={setSigAlg}
                onPrivateKeyPemChange={setPrivateKeyPem}
                onSignRedirect={handleSignRedirect}
                onCopy={copy}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
