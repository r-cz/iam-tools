import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { getIssuerBaseUrl } from '@/lib/jwt/generate-signed-token'
import { isAllowedDemoRedirectUri } from '../utils/demo-redirect'

export function DemoAuthPage() {
  const [searchParams] = useSearchParams()

  // Extract OAuth parameters from URL
  const clientId = searchParams.get('client_id') || ''
  const redirectUri = searchParams.get('redirect_uri') || ''
  const state = searchParams.get('state') || ''
  const scope = searchParams.get('scope') || ''
  const codeChallenge = searchParams.get('code_challenge') || ''
  const codeChallengeMethod = searchParams.get('code_challenge_method') || ''
  const redirectAllowed = redirectUri
    ? isAllowedDemoRedirectUri(redirectUri, window.location.href)
    : false

  // Form state
  const [username, setUsername] = useState('demo-user')
  const error = !clientId
    ? 'Missing client_id parameter'
    : !redirectUri
      ? 'Missing redirect_uri parameter'
      : !redirectAllowed
        ? 'The redirect_uri is not registered for this demo provider.'
        : !codeChallenge
          ? 'Missing code_challenge parameter'
          : codeChallengeMethod !== 'S256'
            ? 'Unsupported code_challenge_method. Only S256 is supported.'
            : null

  // Handle login
  const handleLogin = () => {
    if (error) return

    if (!username.trim()) {
      return
    }

    const authUrl = new URL(`${getIssuerBaseUrl()}/auth`)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('login_hint', username.trim())

    if (state) {
      authUrl.searchParams.set('state', state)
    }
    if (scope) {
      authUrl.searchParams.set('scope', scope)
    }
    if (codeChallenge) {
      authUrl.searchParams.set('code_challenge', codeChallenge)
    }
    if (codeChallengeMethod) {
      authUrl.searchParams.set('code_challenge_method', codeChallengeMethod)
    }

    window.location.href = authUrl.toString()
  }

  // Handle deny
  const handleDeny = () => {
    if (error) return

    // Construct the redirect URL with the error
    const redirectUrl = new URL(redirectUri)
    redirectUrl.searchParams.set('error', 'access_denied')
    redirectUrl.searchParams.set('error_description', 'The user denied the authorization request')

    // Add state if provided
    if (state) {
      redirectUrl.searchParams.set('state', state)
    }

    // Redirect back to the client
    window.location.href = redirectUrl.toString()
  }

  return (
    <div className="container py-10 flex flex-col items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Demo Identity Provider</CardTitle>
          <CardDescription>
            This is a simulated login page for demonstration purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Authorization Request</h3>
                <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                  <p>
                    <strong>Client ID:</strong> {clientId}
                  </p>
                  {scope && (
                    <p>
                      <strong>Requested Scopes:</strong> {scope}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value="demo-password"
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is a demo - no real password needed
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" onClick={handleDeny} disabled={!!error}>
              Deny
            </Button>
            <Button onClick={handleLogin} disabled={!!error}>
              Authorize
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            This is a simulated authorization server for demonstration purposes only. No actual
            authentication is performed.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default DemoAuthPage
