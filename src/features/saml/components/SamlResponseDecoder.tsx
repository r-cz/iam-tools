import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  decodeSamlResponse,
  validateSamlResponse,
  type DecodedSamlResponse,
} from '../utils/saml-decoder'
import { ResponseDisplay } from './ResponseDisplay'
import { AssertionDisplay } from './AssertionDisplay'
import { SignatureDisplay } from './SignatureDisplay'
import {
  AlertCircle,
  Search,
  Shield,
  FileKey,
  CheckCircle,
  TestTubeDiagonal,
  RotateCcw,
} from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

const formatSamlInstant = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z')

const buildExampleResponse = () => {
  const now = Date.now()
  const issueInstant = formatSamlInstant(new Date(now))
  const notBefore = formatSamlInstant(new Date(now - 60_000))
  const notOnOrAfter = formatSamlInstant(new Date(now + 5 * 60_000))
  const authnInstant = formatSamlInstant(new Date(now - 30_000))

  const responseId = '_demo-response'
  const assertionId = '_demo-assertion'
  const inResponseTo = '_demo-request'
  const destination = 'https://example.com/saml/acs'
  const issuer = 'https://idp.example.com'
  const audience = 'https://example.com'
  const sessionIndex = '_demo-session'

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${responseId}" Version="2.0" IssueInstant="${issueInstant}" Destination="${destination}" InResponseTo="${inResponseTo}">
  <saml:Issuer>${issuer}</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success" />
  </samlp:Status>
  <saml:Assertion ID="${assertionId}" Version="2.0" IssueInstant="${issueInstant}">
    <saml:Issuer>${issuer}</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:2.0:nameid-format:transient">_demo-user</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter}" Recipient="${destination}" InResponseTo="${inResponseTo}" />
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="${notBefore}" NotOnOrAfter="${notOnOrAfter}">
      <saml:AudienceRestriction>
        <saml:Audience>${audience}</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="${authnInstant}" SessionIndex="${sessionIndex}">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:Password</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="email">
        <saml:AttributeValue>demo.user@example.com</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="name">
        <saml:AttributeValue>Demo User</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`

  return btoa(xml)
}

export function SamlResponseDecoder() {
  const [input, setInput] = useState('')
  const [decodedResponse, setDecodedResponse] = useState<DecodedSamlResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('response')

  const validation = useMemo(
    () => (decodedResponse ? validateSamlResponse(decodedResponse) : null),
    [decodedResponse]
  )

  const statusClassName = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return 'bg-green-500/20 text-green-700'
      case 'warning':
        return 'bg-amber-500/20 text-amber-700'
      case 'fail':
        return 'bg-red-500/20 text-red-700'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const handleDecode = () => {
    try {
      setError(null)
      const decoded = decodeSamlResponse(input.trim())
      setDecodedResponse(decoded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decode SAML response')
      setDecodedResponse(null)
    }
  }

  const handleClear = () => {
    setInput('')
    setDecodedResponse(null)
    setError(null)
    setActiveTab('response')
  }

  const handleExample = () => {
    setInput(buildExampleResponse())
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Card */}
      <Card className="lg:col-span-1 py-3">
        <CardContent className="px-5 pb-4 pt-1 space-y-3">
          <InputGroup className="flex-wrap border-0 bg-transparent shadow-none">
            <InputGroupAddon
              align="block-start"
              className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent border-0 py-1.5"
            >
              <span className="text-sm font-medium text-foreground">SAML Response (Base64)</span>
              <div className="flex items-center gap-1.5">
                <InputGroupButton
                  onClick={handleExample}
                  grouped={false}
                  variant="outline"
                  className="flex items-center gap-1.5"
                  aria-label="Load example response"
                >
                  <TestTubeDiagonal size={16} />
                  <span className="hidden sm:inline">Example</span>
                </InputGroupButton>
                <InputGroupButton
                  variant="ghost"
                  grouped={false}
                  className="flex items-center gap-1.5 border border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                  onClick={handleClear}
                  aria-label="Clear response"
                >
                  <RotateCcw size={16} />
                  <span className="hidden sm:inline">Clear</span>
                </InputGroupButton>
              </div>
            </InputGroupAddon>
            <InputGroupTextarea
              id="saml-input"
              placeholder="Paste your base64-encoded SAML Response here..."
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              className="min-h-[200px] resize-y font-mono text-sm"
            />
            <InputGroupAddon
              align="block-end"
              className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent border-0 py-1.5"
            >
              {input && (
                <InputGroupText className="tracking-normal font-mono normal-case text-muted-foreground">
                  <span className="hidden sm:inline">Characters:</span> {input.length}
                </InputGroupText>
              )}
              <InputGroupButton
                variant="outline"
                grouped={false}
                className="ml-auto flex items-center gap-1.5 rounded-md"
                onClick={handleDecode}
                disabled={!input.trim()}
                aria-label="Decode response"
              >
                <Search size={16} />
                <span className="hidden sm:inline">Decode Response</span>
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Decoded Response Card */}
      {decodedResponse && (
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Decoded SAML Response</span>
              <div className="flex gap-2">
                {decodedResponse.status === 'Success' ? (
                  <Badge variant="outline" className="bg-green-500/20 text-green-700">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Success
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/20 text-red-700">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {decodedResponse.status}
                  </Badge>
                )}
                {decodedResponse.hasSignature && (
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-700">
                    <Shield className="mr-1 h-3 w-3" />
                    Signed
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="response">Response</TabsTrigger>
                <TabsTrigger value="assertion">Assertion</TabsTrigger>
                <TabsTrigger value="signature">Signature</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
              </TabsList>

              <TabsContent value="response" className="mt-4">
                <ResponseDisplay response={decodedResponse} />
              </TabsContent>

              <TabsContent value="assertion" className="mt-4">
                <AssertionDisplay response={decodedResponse} />
              </TabsContent>

              <TabsContent value="signature" className="mt-4">
                <SignatureDisplay response={decodedResponse} />
              </TabsContent>

              <TabsContent value="validation" className="mt-4">
                {validation ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Overall</div>
                      <Badge variant="outline" className={statusClassName(validation.overall)}>
                        {validation.overall.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Response Checks</div>
                      <div className="space-y-2">
                        {validation.responseChecks.map((check) => (
                          <div
                            key={check.id}
                            className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-3"
                          >
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{check.label}</div>
                              <div className="text-xs text-muted-foreground">{check.message}</div>
                            </div>
                            <Badge variant="outline" className={statusClassName(check.status)}>
                              {check.status.toUpperCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {validation.assertionChecks.map((assertion, index) => (
                      <div key={assertion.id} className="space-y-2">
                        <div className="text-sm font-medium">Assertion #{index + 1}</div>
                        <div className="space-y-2">
                          {assertion.checks.map((check) => (
                            <div
                              key={`${assertion.id}-${check.id}`}
                              className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-3"
                            >
                              <div className="space-y-1">
                                <div className="text-sm font-medium">{check.label}</div>
                                <div className="text-xs text-muted-foreground">{check.message}</div>
                              </div>
                              <Badge variant="outline" className={statusClassName(check.status)}>
                                {check.status.toUpperCase()}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Decode a response to view validation checks.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Placeholder when no response is decoded */}
      {!decodedResponse && !error && (
        <Empty className="lg:col-span-1 py-12">
          <EmptyMedia variant="icon" className="bg-primary/10 text-primary">
            <FileKey className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>No response loaded</EmptyTitle>
          <EmptyDescription>
            Paste a SAML response above and select{' '}
            <span className="font-medium">Decode Response</span> to analyze it.
          </EmptyDescription>
        </Empty>
      )}
    </div>
  )
}
