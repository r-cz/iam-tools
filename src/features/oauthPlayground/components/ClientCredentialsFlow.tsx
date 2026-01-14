import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom' // Import useNavigate
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch' // Import Switch
import { Textarea } from '@/components/ui/textarea'
import { IssuerHistory, JsonDisplay, FormFieldInput } from '@/components/common'
import { useIssuerHistory } from '@/lib/state'
import { proxyFetch } from '@/lib/proxy-fetch'
import { getIssuerBaseUrl } from '@/lib/jwt/generate-signed-token'
import { toast } from 'sonner'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { FieldSet, FieldLegend, FieldDescription } from '@/components/ui/field'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { cn } from '@/lib/utils'
import { Clock, Hash, Layers, ShieldCheck } from 'lucide-react'
import { ButtonGroup } from '@/components/ui/button-group'

interface TokenResponse {
  access_token?: string
  token_type?: string
  expires_in?: number
  scope?: string
  error?: string
  error_description?: string
  [key: string]: any
}

export function ClientCredentialsFlow() {
  const navigate = useNavigate() // Instantiate useNavigate
  const { addIssuer } = useIssuerHistory()
  const [tokenEndpoint, setTokenEndpoint] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [scope, setScope] = useState('')
  const [customClaims, setCustomClaims] = useState('')
  const [customClaimsError, setCustomClaimsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TokenResponse | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false) // Add state for demo mode
  const [configLoading, setConfigLoading] = useState(false)

  // Update values when demo mode changes
  React.useEffect(() => {
    if (isDemoMode) {
      const demoIssuer = getIssuerBaseUrl()
      setTokenEndpoint(`${demoIssuer}/token`)
      setClientId('demo-client-credentials-client')
      setClientSecret('demo-client-secret')
      setScope('api:read api:write')
    } else {
      // Clear demo values when switching off
      setTokenEndpoint('')
      setClientId('')
      setClientSecret('')
      setScope('')
    }
  }, [isDemoMode])

  // Handle issuer selection from history
  const handleSelectIssuer = async (issuerUrl: string) => {
    setConfigLoading(true)

    try {
      // Construct the well-known URL
      const url = new URL(issuerUrl)
      const basePath = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`
      const wellKnownUrl = new URL(
        `${basePath}.well-known/openid-configuration`,
        url.origin
      ).toString()

      // Fetch OIDC configuration to get token endpoint
      const response = await proxyFetch(wellKnownUrl)

      if (response.ok) {
        const config = await response.json()
        if (config.token_endpoint) {
          setTokenEndpoint(config.token_endpoint)
          // Add issuer to history
          addIssuer(issuerUrl)
        } else {
          // Show error if no token endpoint is available
          toast.error('This issuer does not have a token endpoint configured')
        }
      } else {
        toast.error('Failed to fetch OIDC configuration')
      }
    } catch (error) {
      toast.error('Error fetching OIDC configuration: ' + (error as Error).message)
    } finally {
      setConfigLoading(false)
    }
  }

  const validateClaims = () => {
    if (!customClaims.trim()) {
      setCustomClaimsError(null)
      return undefined
    }

    try {
      const parsed = JSON.parse(customClaims)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Claims JSON must be an object')
      }
      setCustomClaimsError(null)
      return customClaims.trim()
    } catch {
      setCustomClaimsError('Claims must be a valid JSON object.')
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    if (!tokenEndpoint) {
      setResult({
        error: 'missing_endpoint',
        error_description: 'Token endpoint is required',
      })
      setLoading(false)
      return
    }

    if (!clientId) {
      setResult({
        error: 'missing_client_id',
        error_description: 'Client ID is required',
      })
      setLoading(false)
      return
    }

    const claimsValue = validateClaims()
    if (claimsValue === null) {
      toast.error('Custom claims must be valid JSON')
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams()
      params.append('grant_type', 'client_credentials')
      params.append('client_id', clientId)
      if (clientSecret) params.append('client_secret', clientSecret)
      if (scope) params.append('scope', scope)
      if (claimsValue) params.append('claims', claimsValue)

      const res = await proxyFetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })

      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setResult({
        error: 'network_error',
        error_description: err.message || 'Network error',
      })
    } finally {
      setLoading(false)
    }
  }

  // Function to handle inspecting the token
  const handleInspectToken = () => {
    if (result?.access_token) {
      const inspectUrl = `/token-inspector?token=${encodeURIComponent(result.access_token)}`
      navigate(inspectUrl)
    }
  }

  const summaryItems: Array<{
    key: string
    title: string
    description: React.ReactNode
    icon?: React.ReactNode
    value?: React.ReactNode
    tone?: 'info' | 'success'
  }> = []

  if (result) {
    if (result.token_type) {
      summaryItems.push({
        key: 'token_type',
        title: 'token_type',
        description: 'Type of token returned by the provider.',
        icon: <ShieldCheck className="h-4 w-4" />,
        value: <code className="font-mono text-xs">{result.token_type}</code>,
        tone: 'info',
      })
    }

    if (typeof result.expires_in === 'number') {
      summaryItems.push({
        key: 'expires_in',
        title: 'expires_in',
        description: 'Lifetime of the token in seconds.',
        icon: <Clock className="h-4 w-4" />,
        value: (
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">
              Expires in approximately {(result.expires_in / 60).toFixed(0)} minute(s)
            </span>
            <code className="font-mono">{result.expires_in}</code>
          </div>
        ),
        tone: 'info',
      })
    }

    if (result.scope) {
      summaryItems.push({
        key: 'scope',
        title: 'scope',
        description: 'Granted scopes included with the access token.',
        icon: <Layers className="h-4 w-4" />,
        value: <code className="font-mono text-xs break-words">{result.scope}</code>,
        tone: 'info',
      })
    }

    if (result.access_token) {
      summaryItems.push({
        key: 'access_token',
        title: 'access_token',
        description: 'Signed access token issued via the client credentials flow.',
        icon: <Hash className="h-4 w-4" />,
        value: (
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">length: {result.access_token.length}</span>
            <code className="font-mono break-words">
              {`${result.access_token.substring(0, 24)}…`}
            </code>
          </div>
        ),
        tone: 'info',
      })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardContent className="p-5">
          {/* Demo Mode Switch */}
          <div className="flex items-center space-x-2 mb-4 p-3 border rounded-md bg-muted/50">
            <Switch id="demo-mode-switch" checked={isDemoMode} onCheckedChange={setIsDemoMode} />
            <Label htmlFor="demo-mode-switch" className="mb-0">
              {' '}
              {/* Remove bottom margin from label */}
              Demo Mode
              <p className="text-xs text-muted-foreground font-normal">
                Use the built-in demo token endpoint to issue tokens.
              </p>
            </Label>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Token Endpoint Input with History (Disabled in Demo Mode) */}
            <InputGroup className="flex-wrap">
              <InputGroupAddon
                align="block-start"
                className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent"
              >
                <span className="text-sm font-medium text-foreground">Token Endpoint</span>
                {!isDemoMode && (
                  <div className="flex items-center gap-1.5">
                    <IssuerHistory
                      onSelectIssuer={handleSelectIssuer}
                      configLoading={configLoading}
                      disabled={isDemoMode}
                      compact
                    />
                    {configLoading && <Spinner size="sm" thickness="thin" aria-hidden="true" />}
                  </div>
                )}
              </InputGroupAddon>
              <InputGroupInput
                id="token-endpoint"
                type="url"
                value={tokenEndpoint}
                onChange={(e) => setTokenEndpoint(e.target.value)}
                required={!isDemoMode}
                disabled={isDemoMode}
                placeholder={
                  isDemoMode ? 'Demo endpoint (auto-filled)' : 'https://example.com/oauth/token'
                }
              />
              {tokenEndpoint && !isDemoMode && (
                <InputGroupAddon align="block-end" className="w-full justify-end bg-transparent">
                  <InputGroupText className="tracking-normal font-mono normal-case text-muted-foreground">
                    len: {tokenEndpoint.length}
                  </InputGroupText>
                </InputGroupAddon>
              )}
            </InputGroup>

            <FieldSet className="space-y-4 rounded-md border border-border p-4">
              <FieldLegend>Client Authentication</FieldLegend>
              <FieldDescription className="text-xs text-muted-foreground">
                Provide client credentials if the token endpoint requires authenticated requests.
              </FieldDescription>

              <FormFieldInput
                id="client-id"
                label="Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required={!isDemoMode}
                placeholder={isDemoMode ? '(Optional for Demo)' : 'Enter Client ID'}
              />

              <FormFieldInput
                id="client-secret"
                label="Client Secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                required={!isDemoMode}
                placeholder={isDemoMode ? 'Optional in demo mode' : 'Enter Client Secret'}
              />

              <FormFieldInput
                id="scope"
                label="Scope (optional)"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="space-separated scopes (e.g., api:read)"
              />

              <div className="grid gap-2">
                <Label htmlFor="custom-claims" className="text-sm font-medium">
                  Custom Claims (JSON)
                </Label>
                <Textarea
                  id="custom-claims"
                  value={customClaims}
                  onChange={(e) => {
                    setCustomClaims(e.target.value)
                    if (!e.target.value.trim()) {
                      setCustomClaimsError(null)
                    }
                  }}
                  rows={4}
                  placeholder='{"role":"service"}'
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Demo endpoints accept the OIDC <code className="font-mono">claims</code>
                  parameter. External IdPs may ignore it.
                </p>
                {customClaimsError && (
                  <p className="text-xs text-destructive">{customClaimsError}</p>
                )}
              </div>
            </FieldSet>
            <Button
              type="submit"
              disabled={loading || (!isDemoMode && (!tokenEndpoint || !clientId || !clientSecret))}
            >
              {loading ? 'Requesting...' : isDemoMode ? 'Request Demo Token' : 'Request Token'}
            </Button>
          </form>
          {result && (
            <FieldSet className="mt-6 space-y-4 rounded-md border border-border p-4">
              <FieldLegend>Result</FieldLegend>
              <FieldDescription className="text-xs text-muted-foreground">
                Details returned from the client credentials grant.
              </FieldDescription>

              <JsonDisplay data={result} className="text-xs max-h-96 overflow-auto" />

              {summaryItems.length > 0 && (
                <FieldSet className="space-y-4 rounded-md border border-border/60 bg-muted/30 p-4">
                  <FieldLegend>Highlights</FieldLegend>
                  <ItemGroup>
                    {summaryItems.map((item) => (
                      <Item
                        key={item.key}
                        className={cn(
                          'border bg-card/90',
                          item.tone === 'info' && 'border-primary/40 bg-primary/5'
                        )}
                      >
                        {item.icon && (
                          <ItemMedia variant="icon" className="bg-muted text-muted-foreground">
                            {item.icon}
                          </ItemMedia>
                        )}
                        <ItemContent className="space-y-2">
                          <ItemTitle className="font-mono text-sm">{item.title}</ItemTitle>
                          <ItemDescription className="text-xs text-muted-foreground">
                            {item.description}
                          </ItemDescription>
                          {item.value && (
                            <div className="text-xs text-foreground/80">{item.value}</div>
                          )}
                        </ItemContent>
                      </Item>
                    ))}
                  </ItemGroup>
                </FieldSet>
              )}

              {result.access_token && (
                <ButtonGroup>
                  <InputGroupButton
                    type="button"
                    variant="outline"
                    onClick={handleInspectToken}
                    className="flex items-center gap-1.5"
                  >
                    Inspect Access Token
                  </InputGroupButton>
                </ButtonGroup>
              )}
            </FieldSet>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ClientCredentialsFlow
