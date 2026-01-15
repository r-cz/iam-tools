import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OAuthConfig, PkceParams, TokenResponse } from '../utils/types'
import { proxyFetch } from '@/lib/proxy-fetch'
import { toast } from 'sonner'
import { JsonDisplay } from '@/components/common'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface TokenExchangeProps {
  config: OAuthConfig
  pkce: PkceParams
  authorizationCode: string
  onTokenExchangeComplete?: (tokenResponse: TokenResponse) => void
}

export function TokenExchange({
  config,
  pkce,
  authorizationCode,
  onTokenExchangeComplete,
}: TokenExchangeProps) {
  const navigate = useNavigate()
  const [isExchanging, setIsExchanging] = useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(null)
  const [tokenRequestPayload, setTokenRequestPayload] = useState<string>('')
  const [customClaims, setCustomClaims] = useState<string>('')
  const [customClaimsError, setCustomClaimsError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string>('')
  const [refreshResponse, setRefreshResponse] = useState<TokenResponse | null>(null)
  const [refreshRequestPayload, setRefreshRequestPayload] = useState<string>('')

  // Create token request payload
  useEffect(() => {
    const payload = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      code_verifier: pkce.codeVerifier,
    })

    if (config.clientSecret) {
      payload.append('client_secret', config.clientSecret)
    }

    if (config.scopes?.length) {
      payload.append('scope', config.scopes.join(' '))
    }

    if (customClaims.trim()) {
      payload.append('claims', customClaims.trim())
    }

    setTokenRequestPayload(payload.toString())
  }, [
    authorizationCode,
    config.clientId,
    config.clientSecret,
    config.redirectUri,
    config.scopes,
    customClaims,
    pkce.codeVerifier,
  ])

  useEffect(() => {
    if (tokenResponse?.refresh_token) {
      setRefreshToken(tokenResponse.refresh_token)
    }
  }, [tokenResponse?.refresh_token])

  useEffect(() => {
    if (!refreshToken) {
      setRefreshRequestPayload('')
      return
    }

    const payload = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
    })

    if (config.clientSecret) {
      payload.append('client_secret', config.clientSecret)
    }

    if (config.scopes?.length) {
      payload.append('scope', config.scopes.join(' '))
    }

    if (customClaims.trim()) {
      payload.append('claims', customClaims.trim())
    }

    setRefreshRequestPayload(payload.toString())
  }, [refreshToken, config.clientId, config.clientSecret, config.scopes, customClaims])

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

  const exchangeToken = async () => {
    setIsExchanging(true)
    setRefreshResponse(null)

    try {
      const tokenEndpoint = config.tokenEndpoint

      if (!tokenEndpoint) {
        toast.error('Token endpoint is required')
        return
      }

      const claimsValue = validateClaims()
      if (claimsValue === null) {
        toast.error('Custom claims must be valid JSON')
        return
      }

      const payload = new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        code_verifier: pkce.codeVerifier,
      })

      if (config.clientSecret) {
        payload.append('client_secret', config.clientSecret)
      }

      if (config.scopes?.length) {
        payload.append('scope', config.scopes.join(' '))
      }

      if (claimsValue) {
        payload.append('claims', claimsValue)
      }

      const response = await proxyFetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload,
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error_description || data.error)
      }

      const tokenData: TokenResponse = {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        refresh_token: data.refresh_token,
        id_token: data.id_token,
        scope: data.scope,
      }

      setTokenResponse(tokenData)
      onTokenExchangeComplete?.(tokenData)

      toast.success(`Successfully refreshed tokens${config.demoMode ? ' (demo mode)' : ''}`)
    } catch (error) {
      if (import.meta?.env?.DEV) {
        console.error('Error refreshing tokens:', error)
      }
      toast.error(
        `Failed to refresh tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsExchanging(false)
    }
  }

  const refreshTokens = async () => {
    setIsRefreshing(true)

    try {
      const tokenEndpoint = config.tokenEndpoint

      if (!tokenEndpoint) {
        toast.error('Token endpoint is required')
        return
      }

      const claimsValue = validateClaims()
      if (claimsValue === null) {
        toast.error('Custom claims must be valid JSON')
        return
      }

      const payload = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
      })

      if (config.clientSecret) {
        payload.append('client_secret', config.clientSecret)
      }

      if (config.scopes?.length) {
        payload.append('scope', config.scopes.join(' '))
      }

      if (claimsValue) {
        payload.append('claims', claimsValue)
      }

      const response = await proxyFetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload,
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error_description || data.error)
      }

      const tokenData: TokenResponse = {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        refresh_token: data.refresh_token,
        id_token: data.id_token,
        scope: data.scope,
      }

      setRefreshResponse(tokenData)
      onTokenExchangeComplete?.(tokenData)

      toast.success(`Successfully refreshed tokens${config.demoMode ? ' (demo mode)' : ''}`)
    } catch (error) {
      if (import.meta?.env?.DEV) {
        console.error('Error refreshing tokens:', error)
      }
      toast.error(
        `Failed to refresh tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Token Exchange</CardTitle>
        <CardDescription>
          Exchange the authorization code for access and ID tokens using the PKCE code verifier.
          {config.demoMode && ' Demo mode: tokens are issued by the demo OAuth server.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Authorization Code</h3>
          <div className="font-mono text-xs bg-muted p-3 rounded-md overflow-x-auto">
            {authorizationCode}
          </div>

          <h3 className="text-sm font-medium">Token Request</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Endpoint:</strong> {config.tokenEndpoint || 'Not configured'}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Method:</strong> POST
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Content-Type:</strong> application/x-www-form-urlencoded
            </p>
            <div className="font-mono text-xs bg-muted p-3 rounded-md overflow-x-auto">
              {tokenRequestPayload}
            </div>
          </div>

          <div className="space-y-2">
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
              placeholder='{"role":"admin","tier":"gold"}'
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Demo endpoints accept the OIDC <code className="font-mono">claims</code> parameter.
              External IdPs may ignore it.
            </p>
            {customClaimsError && <p className="text-xs text-destructive">{customClaimsError}</p>}
          </div>
        </div>

        {tokenResponse && (
          <Tabs defaultValue="formatted">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="formatted">Formatted</TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
            </TabsList>

            <TabsContent value="formatted">
              <div className="space-y-4">
                {tokenResponse.access_token && (
                  <div>
                    <h3 className="text-sm font-medium">Access Token</h3>
                    <div className="font-mono text-xs bg-muted p-3 rounded-md max-h-40 overflow-auto">
                      {tokenResponse.access_token}
                    </div>
                  </div>
                )}

                {tokenResponse.id_token && (
                  <div>
                    <h3 className="text-sm font-medium">ID Token</h3>
                    <div className="font-mono text-xs bg-muted p-3 rounded-md max-h-40 overflow-auto">
                      {tokenResponse.id_token}
                    </div>
                  </div>
                )}

                {tokenResponse.refresh_token && (
                  <div>
                    <h3 className="text-sm font-medium">Refresh Token</h3>
                    <div className="font-mono text-xs bg-muted p-3 rounded-md max-h-40 overflow-auto">
                      {tokenResponse.refresh_token}
                    </div>
                  </div>
                )}

                <div className="bg-muted rounded-md p-3">
                  <h3 className="text-sm font-medium mb-2">Token Details</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>
                      <strong>Token Type:</strong> {tokenResponse.token_type}
                    </li>
                    {tokenResponse.expires_in && (
                      <li>
                        <strong>Expires In:</strong> {tokenResponse.expires_in} seconds
                      </li>
                    )}
                    {tokenResponse.scope && (
                      <li>
                        <strong>Scope:</strong> {tokenResponse.scope}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="raw">
              <JsonDisplay data={tokenResponse} containerClassName="relative" />
            </TabsContent>
          </Tabs>
        )}

        {tokenResponse?.refresh_token && (
          <div className="space-y-4 border-t border-border/60 pt-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Refresh Token Flow</h3>
              <p className="text-xs text-muted-foreground">
                Use the refresh token to request updated access tokens.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refresh-token" className="text-sm font-medium">
                Refresh Token
              </Label>
              <Textarea
                id="refresh-token"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                rows={3}
                className="font-mono text-xs"
              />
            </div>
            {refreshRequestPayload && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Refresh Request</strong>
                </p>
                <div className="font-mono text-xs bg-muted p-3 rounded-md overflow-x-auto">
                  {refreshRequestPayload}
                </div>
              </div>
            )}
            <Button onClick={refreshTokens} disabled={isRefreshing || !refreshToken}>
              {isRefreshing ? 'Refreshing...' : 'Refresh Tokens'}
            </Button>
            {refreshResponse && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Refresh Response</div>
                <JsonDisplay data={refreshResponse} containerClassName="relative" />
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!tokenResponse ? (
          <Button onClick={exchangeToken} disabled={isExchanging} className="w-full">
            {isExchanging ? 'Exchanging...' : 'Exchange Code for Tokens'}
          </Button>
        ) : (
          <div className="w-full space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                // Use React Router navigation for a smoother experience
                if (tokenResponse.access_token) {
                  navigate(
                    `/token-inspector?token=${encodeURIComponent(tokenResponse.access_token)}`
                  )
                }
              }}
            >
              Inspect Access Token
            </Button>

            {tokenResponse.id_token && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // Use React Router navigation for a smoother experience
                  // Add ! to assert that id_token is not null/undefined here
                  navigate(`/token-inspector?token=${encodeURIComponent(tokenResponse.id_token!)}`)
                }}
              >
                Inspect ID Token
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

export default TokenExchange
