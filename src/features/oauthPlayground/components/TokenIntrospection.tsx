import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useAppState } from '@/lib/state'
import { CheckCircle, XCircle } from 'lucide-react'
import { signToken } from '@/lib/jwt/sign-token'
import { DEMO_JWKS } from '@/lib/jwt/demo-key'
import { proxyFetch } from '@/lib/proxy-fetch'
import { generateFreshToken } from '@/features/tokenInspector/utils/generate-token'
import { toast } from 'sonner'
import {
  IssuerHistory,
  TokenHistoryDropdown,
  JsonDisplay,
  FormFieldInput,
} from '@/components/common'
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

interface IntrospectionResponse {
  active: boolean
  scope?: string
  client_id?: string
  username?: string
  token_type?: string
  exp?: number
  iat?: number
  nbf?: number
  sub?: string
  aud?: string
  iss?: string
  jti?: string
  error?: string
  error_description?: string
  [key: string]: any
}

export function TokenIntrospection() {
  const navigate = useNavigate()
  const { addToken } = useAppState()

  // Endpoint state
  const [introspectionEndpoint, setIntrospectionEndpoint] = useState('')
  const [token, setToken] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IntrospectionResponse | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [configLoading, setConfigLoading] = useState(false)
  const [isLoadingDemoToken, setIsLoadingDemoToken] = useState(false)

  // Auto-fill demo token when demo mode is enabled
  useEffect(() => {
    const loadDemoToken = async () => {
      if (isDemoMode) {
        if (!token) {
          setIsLoadingDemoToken(true)
          try {
            const demoToken = await generateFreshToken()
            setToken(demoToken)
            toast.success('Demo token loaded')
          } catch (error) {
            if (import.meta?.env?.DEV) {
              console.error('Error loading demo token:', error)
            }
            toast.error('Failed to load demo token')
          } finally {
            setIsLoadingDemoToken(false)
          }
        }
        // Also set a default client ID for demo mode
        if (!clientId) {
          setClientId('demo-client')
        }
      }
    }

    loadDemoToken()
  }, [clientId, isDemoMode, token])

  // Generate a sample introspection response for demo mode
  const generateDemoIntrospectionResponse = async (): Promise<IntrospectionResponse> => {
    try {
      // Create a demo token if none provided
      let tokenToIntrospect = token

      if (!tokenToIntrospect) {
        // Generate a sample token
        const currentTime = Math.floor(Date.now() / 1000)
        const demoClientId = clientId || 'demo-client'

        const tokenPayload = {
          iss: `${window.location.origin}/oauth-playground/demo`,
          sub: 'demo-user-123',
          aud: 'https://api.example.com/resource',
          exp: currentTime + 3600, // Expires in 1 hour
          iat: currentTime - 300, // Issued 5 minutes ago
          nbf: currentTime - 300, // Not valid before 5 minutes ago
          scope: 'openid profile email api:read',
          client_id: demoClientId,
          jti: `demo-${Math.random().toString(36).substring(2, 15)}`,
          is_demo_token: true,
        }

        tokenToIntrospect = await signToken(tokenPayload, { kid: DEMO_JWKS.keys[0].kid })
        setToken(tokenToIntrospect)
      }

      // Extract token parts
      const parts = tokenToIntrospect.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format')
      }

      // Parse the payload
      const payload = JSON.parse(atob(parts[1]))
      const currentTime = Math.floor(Date.now() / 1000)

      // Generate introspection response based on the token
      return {
        active: payload.exp ? payload.exp > currentTime : true,
        scope: payload.scope || 'openid profile',
        client_id: payload.client_id || clientId || 'demo-client',
        token_type: 'Bearer',
        exp: payload.exp,
        iat: payload.iat,
        nbf: payload.nbf,
        sub: payload.sub,
        aud: payload.aud,
        iss: payload.iss,
        jti: payload.jti,
        username: payload.sub,
      }
    } catch (error: any) {
      if (import.meta?.env?.DEV) {
        console.error('Error generating demo introspection response:', error)
      }
      return {
        active: false,
        error: 'invalid_token',
        error_description: error.message || 'Failed to introspect token',
      }
    }
  }

  // Handle token selection from history
  const handleSelectToken = (tokenValue: string) => {
    setToken(tokenValue)
  }

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

      // Fetch OIDC configuration to get introspection endpoint
      const response = await proxyFetch(wellKnownUrl)

      if (response.ok) {
        const config = await response.json()
        if (config.introspection_endpoint) {
          setIntrospectionEndpoint(config.introspection_endpoint)
        } else {
          // Show error if no introspection endpoint is available
          toast.error('This issuer does not have an introspection endpoint configured')
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    if (!token) {
      setResult({
        active: false,
        error: 'missing_token',
        error_description: 'Token is required',
      })
      setLoading(false)
      return
    }

    if (isDemoMode) {
      // Generate demo response
      const demoResult = await generateDemoIntrospectionResponse()
      setResult(demoResult)

      // Add token to history if it's valid
      if (token && demoResult.active !== false) {
        addToken(token)
      }
    } else {
      // Validate required fields for real request
      if (!introspectionEndpoint) {
        setResult({
          active: false,
          error: 'missing_endpoint',
          error_description: 'Introspection endpoint is required',
        })
        setLoading(false)
        return
      }

      // Perform real network request
      try {
        // Create form data for introspection request
        const params = new URLSearchParams()
        params.append('token', token)

        // Add client credentials if provided
        if (clientId) params.append('client_id', clientId)
        if (clientSecret) params.append('client_secret', clientSecret)

        // Make the introspection request
        const res = await fetch(introspectionEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(clientId && clientSecret
              ? {
                  Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
                }
              : {}),
          },
          body: params.toString(),
        })

        const data = await res.json()
        setResult(data)

        // Add token to history if it's valid
        if (token && data.active !== false) {
          addToken(token)
        }
      } catch (err: any) {
        setResult({
          active: false,
          error: 'network_error',
          error_description: err.message || 'Network error',
        })
      }
    }

    setLoading(false)
  }

  // Handle inspection of token in token inspector
  const handleInspectToken = () => {
    if (token) {
      const inspectUrl = `/token-inspector?token=${encodeURIComponent(token)}`
      navigate(inspectUrl)
    }
  }

  const keyClaims: Array<{
    key: string
    title: string
    description: React.ReactNode
    icon?: React.ReactNode
    value?: React.ReactNode
    badge?: React.ReactNode
    footer?: React.ReactNode
    tone?: 'success' | 'destructive'
  }> = []

  if (result) {
    if (result.active !== undefined) {
      keyClaims.push({
        key: 'active',
        title: 'active',
        description: 'Boolean indicator of whether the token is currently active.',
        icon: result.active ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />,
        value: <code className="font-mono text-xs">{String(result.active)}</code>,
        badge: (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            Required
          </Badge>
        ),
        footer:
          result.active === false && result.error ? (
            <p className="text-xs text-destructive">{result.error_description || result.error}</p>
          ) : undefined,
        tone: result.active ? 'success' : 'destructive',
      })
    }

    if (result.exp) {
      const expired = result.exp * 1000 < Date.now()
      keyClaims.push({
        key: 'exp',
        title: 'exp',
        description: 'Integer timestamp indicating when the token expires.',
        icon: expired ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
        value: (
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">
              {new Date(result.exp * 1000).toLocaleString()}
            </span>
            <code className="font-mono">{result.exp}</code>
          </div>
        ),
        badge: expired ? (
          <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
            Expired
          </Badge>
        ) : undefined,
        tone: expired ? 'destructive' : undefined,
      })
    }

    if (result.scope) {
      keyClaims.push({
        key: 'scope',
        title: 'scope',
        description: 'Space-delimited scopes granted to the access token.',
        value: <code className="font-mono text-xs break-words">{result.scope}</code>,
      })
    }

    if (result.client_id) {
      keyClaims.push({
        key: 'client_id',
        title: 'client_id',
        description: 'Client identifier that was issued the access token.',
        value: <code className="font-mono text-xs break-words">{result.client_id}</code>,
      })
    }

    if (result.sub) {
      keyClaims.push({
        key: 'sub',
        title: 'sub',
        description: 'Subject identifier for the authenticated principal.',
        value: <code className="font-mono text-xs break-words">{result.sub}</code>,
      })
    }

    if (result.iss) {
      keyClaims.push({
        key: 'iss',
        title: 'iss',
        description: 'Issuer that generated this token.',
        value: <code className="font-mono text-xs break-words">{result.iss}</code>,
      })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardContent className="p-5">
          {/* Demo Mode Switch */}
          <div className="flex items-center space-x-2 mb-4 p-3 border rounded-md bg-muted/50">
            <Switch
              id="demo-mode-switch"
              checked={isDemoMode}
              onCheckedChange={setIsDemoMode}
              disabled={isLoadingDemoToken}
            />
            <Label htmlFor="demo-mode-switch" className="mb-0">
              Demo Mode
              <p className="text-xs text-muted-foreground font-normal">
                Generate a simulated introspection response locally without making network requests.
              </p>
              {isLoadingDemoToken && (
                <p className="text-xs text-muted-foreground font-normal mt-1">
                  Loading demo token...
                </p>
              )}
            </Label>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Introspection Endpoint Input with History */}
            <InputGroup className="flex-wrap">
              <InputGroupAddon
                align="block-start"
                className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent"
              >
                <span className="text-sm font-medium text-foreground">Introspection Endpoint</span>
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
                id="introspection-endpoint"
                type="url"
                value={introspectionEndpoint}
                onChange={(e) => setIntrospectionEndpoint(e.target.value)}
                required={!isDemoMode}
                disabled={isDemoMode}
                placeholder={
                  isDemoMode ? 'N/A (Demo Mode)' : 'https://example.com/oauth/introspect'
                }
              />
            </InputGroup>

            {/* Token Input with History */}
            <InputGroup className="flex-wrap">
              <InputGroupAddon
                align="block-start"
                className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent"
              >
                <span className="text-sm font-medium text-foreground">Token to Introspect</span>
                <div className="flex items-center gap-1.5">
                  {token && (
                    <InputGroupText className="tracking-normal font-mono normal-case">
                      len: {token.length}
                    </InputGroupText>
                  )}
                  <TokenHistoryDropdown
                    onSelectToken={handleSelectToken}
                    disabled={isDemoMode}
                    compact
                  />
                  <InputGroupButton
                    type="button"
                    variant="outline"
                    onClick={handleInspectToken}
                    disabled={!token}
                    className="flex items-center gap-1.5"
                  >
                    View in Token Inspector
                  </InputGroupButton>
                </div>
              </InputGroupAddon>
              <InputGroupInput
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                placeholder="Enter token to introspect"
                className="font-mono text-xs"
              />
            </InputGroup>

            {/* Client Credentials Section */}
            <FieldSet className="space-y-4 rounded-md border border-border p-4">
              <FieldLegend>Client Authentication (Optional)</FieldLegend>
              <FieldDescription className="text-xs text-muted-foreground">
                Provide client credentials if your introspection endpoint requires HTTP
                authentication.
              </FieldDescription>

              <FormFieldInput
                id="client-id"
                label="Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter Client ID"
              />

              <FormFieldInput
                id="client-secret"
                label="Client Secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                disabled={isDemoMode}
                placeholder={isDemoMode ? 'N/A (Demo Mode)' : 'Enter Client Secret'}
              />
            </FieldSet>

            <Button type="submit" disabled={loading}>
              {loading
                ? 'Processing...'
                : isDemoMode
                  ? 'Generate Demo Response'
                  : 'Introspect Token'}
            </Button>
          </form>

          {/* Results Section */}
          {result && (
            <FieldSet className="mt-6 space-y-4 rounded-md border border-border p-4">
              <FieldLegend>Introspection Result</FieldLegend>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldDescription className="text-xs text-muted-foreground">
                  Complete response from the introspection endpoint.
                </FieldDescription>
                {isDemoMode && (
                  <Badge
                    variant="outline"
                    className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/10"
                  >
                    Demo Response
                  </Badge>
                )}
              </div>

              <JsonDisplay data={result} className="text-xs max-h-96 overflow-auto" />

              {keyClaims.length > 0 && (
                <FieldSet className="space-y-4 rounded-md border border-border/60 bg-muted/30 p-4">
                  <FieldLegend>Key Claims Explained</FieldLegend>
                  <FieldDescription className="text-xs text-muted-foreground">
                    Notable attributes from the token inspection with quick explanations.
                  </FieldDescription>
                  <ItemGroup>
                    {keyClaims.map((claim) => (
                      <Item
                        key={claim.key}
                        className={cn(
                          'border bg-card/90',
                          claim.tone === 'success' && 'border-green-500/40 bg-green-500/10',
                          claim.tone === 'destructive' && 'border-destructive/40 bg-destructive/10'
                        )}
                      >
                        {claim.icon && (
                          <ItemMedia
                            variant="icon"
                            className={cn(
                              'bg-muted text-muted-foreground',
                              claim.tone === 'success' && 'bg-green-500/20 text-green-700',
                              claim.tone === 'destructive' && 'bg-destructive/20 text-destructive'
                            )}
                          >
                            {claim.icon}
                          </ItemMedia>
                        )}
                        <ItemContent className="space-y-2">
                          <div className="flex items-center gap-2">
                            <ItemTitle className="font-mono text-sm">{claim.title}</ItemTitle>
                            {claim.badge}
                          </div>
                          <ItemDescription className="text-xs text-muted-foreground">
                            {claim.description}
                          </ItemDescription>
                          {claim.value && (
                            <div className="text-xs text-foreground/80">{claim.value}</div>
                          )}
                          {claim.footer}
                        </ItemContent>
                      </Item>
                    ))}
                  </ItemGroup>
                </FieldSet>
              )}
            </FieldSet>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TokenIntrospection
