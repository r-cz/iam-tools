import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { IssuerHistory, TokenHistoryDropdown, JsonDisplay } from '@/components/common'
import { useIssuerHistory, useAppState } from '@/lib/state'
import { proxyFetch } from '@/lib/proxy-fetch'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Clock, Globe, Mail, MapPin, User, UserRound } from 'lucide-react'
import { generateFreshToken } from '@/features/tokenInspector/utils/generate-token'
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

interface UserInfoResponse {
  sub?: string
  name?: string
  given_name?: string
  family_name?: string
  middle_name?: string
  nickname?: string
  preferred_username?: string
  profile?: string
  picture?: string
  website?: string
  email?: string
  email_verified?: boolean
  gender?: string
  birthdate?: string
  zoneinfo?: string
  locale?: string
  phone_number?: string
  phone_number_verified?: boolean
  address?: {
    formatted?: string
    street_address?: string
    locality?: string
    region?: string
    postal_code?: string
    country?: string
  }
  updated_at?: number
  error?: string
  error_description?: string
  [key: string]: any
}

export function UserInfo() {
  const navigate = useNavigate()
  const { addIssuer } = useIssuerHistory()
  const { addToken } = useAppState()

  // Form state
  const [userInfoEndpoint, setUserInfoEndpoint] = useState('')
  const [accessToken, setAccessToken] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UserInfoResponse | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [configLoading, setConfigLoading] = useState(false)
  const [isLoadingDemoToken, setIsLoadingDemoToken] = useState(false)

  // Auto-fill demo token when demo mode is enabled
  useEffect(() => {
    const loadDemoToken = async () => {
      if (isDemoMode) {
        if (!accessToken) {
          setIsLoadingDemoToken(true)
          try {
            const demoToken = await generateFreshToken()
            setAccessToken(demoToken)
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
      }
    }

    loadDemoToken()
  }, [isDemoMode, accessToken])

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

      // Fetch OIDC configuration to get userinfo endpoint
      const response = await proxyFetch(wellKnownUrl)

      if (response.ok) {
        const config = await response.json()
        if (config.userinfo_endpoint) {
          setUserInfoEndpoint(config.userinfo_endpoint)
          // Add issuer to history
          addIssuer(issuerUrl)
        } else {
          // Show error if no userinfo endpoint is available
          toast.error('This issuer does not have a userinfo endpoint configured')
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

  // Handle token selection from history
  const handleSelectToken = (tokenValue: string) => {
    setAccessToken(tokenValue)
  }

  const generateDemoUserInfo = (): UserInfoResponse => {
    try {
      // Create a realistic demo user info response
      return {
        sub: 'demo-user-123',
        name: 'Demo User',
        given_name: 'Demo',
        family_name: 'User',
        preferred_username: 'demouser',
        email: 'demo@example.com',
        email_verified: true,
        picture:
          'https://notion-avatar.app/api/svg/eyJmYWNlIjowLCJub3NlIjoxMCwibW91dGgiOjAsImV5ZXMiOjksImV5ZWJyb3dzIjoyLCJnbGFzc2VzIjowLCJoYWlyIjoxMCwiYWNjZXNzb3JpZXMiOjAsImRldGFpbHMiOjAsImJlYXJkIjoxLCJmbGlwIjowLCJjb2xvciI6InJnYmEoMjU1LCAwLCAwLCAwKSIsInNoYXBlIjoibm9uZSJ9',
        locale: 'en-US',
        updated_at: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
        zoneinfo: 'America/Los_Angeles',
        address: {
          formatted: '123 Demo St, Demo City, DC 12345, USA',
          street_address: '123 Demo St',
          locality: 'Demo City',
          region: 'DC',
          postal_code: '12345',
          country: 'USA',
        },
        is_demo_response: true, // Mark as demo response
      }
    } catch (error: any) {
      if (import.meta?.env?.DEV) {
        console.error('Error generating demo userinfo:', error)
      }
      return {
        error: 'userinfo_generation_failed',
        error_description: error.message || 'Failed to generate demo user info',
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    if (isDemoMode) {
      // Generate demo userinfo
      const demoResult = generateDemoUserInfo()
      setResult(demoResult)

      // Add the token to history (only if provided in demo mode)
      if (accessToken) {
        addToken(accessToken)
      }
    } else {
      // In non-demo mode, token is required
      if (!accessToken) {
        setResult({
          error: 'missing_token',
          error_description: 'Access token is required',
        })
        setLoading(false)
        return
      }
      // Validate required fields for real request
      if (!userInfoEndpoint) {
        setResult({
          error: 'missing_endpoint',
          error_description: 'UserInfo endpoint is required',
        })
        setLoading(false)
        return
      }

      // Perform real network request
      try {
        const res = await proxyFetch(userInfoEndpoint, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(
            errorData.error_description || errorData.error || `HTTP error ${res.status}`
          )
        }

        const data = await res.json()
        setResult(data)

        // Add the token to history if request was successful
        if (accessToken) {
          addToken(accessToken)
        }
      } catch (err: any) {
        setResult({
          error: 'request_failed',
          error_description: err.message || 'Failed to fetch user info',
        })
      }
    }

    setLoading(false)
  }

  // Function to handle inspecting the token
  const handleInspectToken = () => {
    if (accessToken) {
      const inspectUrl = `/token-inspector?token=${encodeURIComponent(accessToken)}`
      navigate(inspectUrl)
    }
  }

  const profileItems: Array<{
    key: string
    title: string
    description: React.ReactNode
    icon?: React.ReactNode
    value?: React.ReactNode
  }> = []

  if (result && !result.error) {
    if (result.sub) {
      profileItems.push({
        key: 'sub',
        title: 'sub',
        description: 'Subject identifier for the authenticated user.',
        icon: <UserRound className="h-4 w-4" />,
        value: <code className="font-mono text-xs break-words">{result.sub}</code>,
      })
    }

    if (result.email) {
      profileItems.push({
        key: 'email',
        title: 'email',
        description: result.email_verified
          ? 'Verified email address.'
          : 'Email address (not verified).',
        icon: <Mail className="h-4 w-4" />,
        value: <span className="text-xs text-foreground/80">{result.email}</span>,
      })
    }

    if (result.locale || result.zoneinfo) {
      profileItems.push({
        key: 'locale',
        title: 'locale',
        description: 'Locale and timezone preferences reported by the provider.',
        icon: <Globe className="h-4 w-4" />,
        value: (
          <div className="flex flex-col gap-1 text-xs">
            {result.locale && <span>Locale: {result.locale}</span>}
            {result.zoneinfo && <span>Zone: {result.zoneinfo}</span>}
          </div>
        ),
      })
    }

    if (result.address?.formatted) {
      profileItems.push({
        key: 'address',
        title: 'address',
        description: 'Formatted postal address.',
        icon: <MapPin className="h-4 w-4" />,
        value: (
          <pre className="whitespace-pre-wrap text-xs text-foreground/80">
            {result.address.formatted}
          </pre>
        ),
      })
    }

    if (result.updated_at) {
      profileItems.push({
        key: 'updated_at',
        title: 'updated_at',
        description: 'When the user profile was last updated.',
        icon: <Clock className="h-4 w-4" />,
        value: (
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">
              {new Date(result.updated_at * 1000).toLocaleString()}
            </span>
            <code className="font-mono">{result.updated_at}</code>
          </div>
        ),
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
                Generate a simulated UserInfo response locally instead of calling the endpoint.
              </p>
              {isLoadingDemoToken && (
                <p className="text-xs text-muted-foreground font-normal mt-1">
                  Loading demo token...
                </p>
              )}
            </Label>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* UserInfo Endpoint Input with History */}
            <InputGroup className="flex-wrap">
              <InputGroupAddon
                align="block-start"
                className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent"
              >
                <span className="text-sm font-medium text-foreground">UserInfo Endpoint</span>
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
                id="userinfo-endpoint"
                type="url"
                value={userInfoEndpoint}
                onChange={(e) => setUserInfoEndpoint(e.target.value)}
                required={!isDemoMode}
                disabled={isDemoMode}
                placeholder={isDemoMode ? 'N/A (Demo Mode)' : 'https://example.com/oauth/userinfo'}
              />
              {userInfoEndpoint && !isDemoMode && (
                <InputGroupAddon align="block-end" className="w-full justify-end bg-transparent">
                  <InputGroupText className="tracking-normal font-mono normal-case text-muted-foreground">
                    len: {userInfoEndpoint.length}
                  </InputGroupText>
                </InputGroupAddon>
              )}
            </InputGroup>

            {/* Access Token Input with History */}
            <InputGroup className="flex-wrap">
              <InputGroupAddon
                align="block-start"
                className="flex w-full flex-wrap items-center justify-between gap-2 bg-transparent"
              >
                <span className="text-sm font-medium text-foreground">Access Token</span>
                <div className="flex items-center gap-1.5">
                  <TokenHistoryDropdown
                    onSelectToken={handleSelectToken}
                    disabled={isDemoMode}
                    compact
                  />
                  {accessToken && (
                    <InputGroupText className="tracking-normal font-mono normal-case">
                      len: {accessToken.length}
                    </InputGroupText>
                  )}
                  <InputGroupButton
                    type="button"
                    variant="outline"
                    onClick={handleInspectToken}
                    disabled={!accessToken}
                    className="flex items-center gap-1.5"
                  >
                    View in Token Inspector
                  </InputGroupButton>
                </div>
              </InputGroupAddon>
              <InputGroupInput
                id="access-token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                required={!isDemoMode}
                placeholder={isDemoMode ? 'Optional in demo mode' : 'Enter your access token'}
                className="font-mono text-xs"
              />
            </InputGroup>

            <Button type="submit" disabled={loading}>
              {loading ? 'Fetching...' : isDemoMode ? 'Generate Demo UserInfo' : 'Get UserInfo'}
            </Button>
          </form>

          {result && (
            <FieldSet className="mt-6 space-y-4 rounded-md border border-border p-4">
              <FieldLegend>UserInfo Result</FieldLegend>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldDescription className="text-xs text-muted-foreground">
                  Claims returned from the UserInfo endpoint.
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

              {result.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{result.error_description || result.error}</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-4 rounded-md border border-dashed border-border/60 bg-muted/20 p-4">
                    {result.picture ? (
                      <img
                        src={result.picture}
                        alt={result.name || result.preferred_username || result.sub || 'User'}
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {result.name || result.preferred_username || result.sub || 'User'}
                      </p>
                      {result.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          {result.email}
                          {result.email_verified === true && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-700">
                              Verified
                            </Badge>
                          )}
                        </p>
                      )}
                      {result.profile && (
                        <a
                          href={result.profile}
                          className="text-xs text-primary underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View profile
                        </a>
                      )}
                    </div>
                  </div>

                  {profileItems.length > 0 && (
                    <ItemGroup>
                      {profileItems.map((item) => (
                        <Item key={item.key} className="border bg-card/90">
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
                  )}
                </>
              )}

              <JsonDisplay data={result} className="text-xs max-h-96 overflow-auto" />
            </FieldSet>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default UserInfo
