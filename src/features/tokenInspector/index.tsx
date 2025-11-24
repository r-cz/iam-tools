import { useState, useEffect } from 'react'
import * as jose from 'jose'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Key } from 'lucide-react'

import {
  TokenInput,
  TokenHeader,
  TokenPayload,
  TokenSignature,
  TokenTimeline,
  TokenSize,
} from './components'
import {
  SignatureStatusBadge,
  TokenTypeBadge,
  DemoTokenBadge,
} from './components/TokenStatusBadges'
import { useTokenDecoder } from './hooks/useTokenDecoder'
import { useTokenHistory } from '../../lib/state'
import { useOidcConfig } from '@/hooks/data-fetching/useOidcConfig'

interface TokenInspectorProps {
  initialToken?: string | null
}

export function TokenInspector({ initialToken = null }: TokenInspectorProps) {
  const [token, setToken] = useState(initialToken || '')
  const [jwks, setJwks] = useState<jose.JSONWebKeySet | null>(null) // Holds the currently loaded JWKS
  const [activeTab, setActiveTab] = useState('payload')
  const [manualIssuerUrl, setManualIssuerUrl] = useState('') // Manual issuer URL override

  // Token decoder hook for decoding and validation logic
  const {
    decodedToken,
    tokenType,
    validationResults,
    isDemoToken,
    issuerUrl: autoIssuerUrl,
    decodeToken,
    resetState,
  } = useTokenDecoder()

  // Use manual issuer if set, otherwise use auto-detected issuer from hook
  const issuerUrl = manualIssuerUrl || autoIssuerUrl

  // Token history state from the app state provider
  const { addToken } = useTokenHistory()

  // OIDC config hook for getting JWKS URI
  const {
    data: oidcConfig,
    currentIssuer: oidcConfigIssuer,
    isLoading: isOidcConfigLoading,
    fetchConfig: fetchOidcConfig,
  } = useOidcConfig()

  // Effect to handle initial token from URL
  useEffect(() => {
    if (initialToken && token !== initialToken) {
      // Process only if initialToken exists and hasn't been processed
      if (import.meta?.env?.DEV) {
        console.log(
          'Processing initial token from URL parameter:',
          initialToken.substring(0, 10) + '...'
        )
      }
      setToken(initialToken) // Set the token state
      // Decode will happen via the useEffect watching `token` state below
    }
    // Intentionally run only when initialToken prop changes
  }, [initialToken])

  // Effect to decode token whenever the 'token' state changes
  useEffect(() => {
    if (import.meta?.env?.DEV) {
      console.log('Token state changed, attempting decode...')
    }
    decodeToken(token, jwks, oidcConfig) // Attempt decode with current token and JWKS state
  }, [token, decodeToken, jwks, oidcConfig]) // Rerun when the main token string changes

  // Effect to fetch OIDC config when issuer changes
  useEffect(() => {
    if (!issuerUrl || isDemoToken) {
      return
    }

    const hasConfigForIssuer = oidcConfig?.issuer === issuerUrl && oidcConfigIssuer === issuerUrl

    if (!hasConfigForIssuer && !isOidcConfigLoading) {
      if (import.meta?.env?.DEV) {
        console.log('Fetching OIDC config for issuer:', issuerUrl)
      }
      fetchOidcConfig(issuerUrl)
    }
  }, [
    fetchOidcConfig,
    isDemoToken,
    isOidcConfigLoading,
    issuerUrl,
    oidcConfig?.issuer,
    oidcConfigIssuer,
  ])

  const handleReset = () => {
    if (import.meta?.env?.DEV) {
      console.log('Resetting Token Inspector state.')
    }
    setToken('') // Clear token input state
    setActiveTab('payload')
    setJwks(null) // Reset loaded JWKS
    setManualIssuerUrl('') // Clear manual issuer override
    resetState() // Call hook's reset function
    // Clear token from URL if it was present
    if (initialToken) {
      const url = new URL(window.location.href)
      url.searchParams.delete('token')
      window.history.replaceState({}, '', url.toString())
    }
  }

  // Effect to add token to history when successfully decoded
  useEffect(() => {
    if (decodedToken && token && token.trim().length > 0) {
      addToken(token)
    }
  }, [decodedToken, token, addToken])

  // Callback for TokenInput when an example token is generated
  // It provides the corresponding DEMO_JWKS immediately
  const handleJwksFromExample = (demoJwks: jose.JSONWebKeySet) => {
    if (import.meta?.env?.DEV) {
      console.log('Received demo JWKS automatically from TokenInput (example generated)')
    }
    setJwks(demoJwks) // Set the JWKS state
    // Re-decode is triggered by the 'token' state change anyway
  }

  // Callback function passed to TokenJwksResolver
  // This is triggered when JWKS are fetched automatically OR loaded manually (incl. demo)
  const handleJwksResolved = async (resolvedJwks: jose.JSONWebKeySet) => {
    if (import.meta?.env?.DEV) {
      console.log('JWKS resolved/loaded in parent:', {
        keyCount: resolvedJwks.keys.length,
        keyIds: resolvedJwks.keys.map((k: { kid?: string }) => k.kid),
      })
    }
    setJwks(resolvedJwks) // Store the resolved JWKS state

    // Re-run validation with the new JWKS if a token is already decoded
    if (decodedToken) {
      if (import.meta?.env?.DEV) {
        console.log('Re-running decode/validation with newly resolved JWKS...')
      }
      await decodeToken(token, resolvedJwks, oidcConfig) // Pass current token and new JWKS
    }
  }

  // Handle token selection from history
  const handleSelectToken = (selectedToken: string) => {
    setToken(selectedToken)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Card */}
      <Card className="lg:col-span-1 py-3">
        <CardContent className="px-5 pb-4 pt-1">
          {/* Token Input Component with integrated history */}
          <TokenInput
            token={token}
            setToken={setToken} // Let input component update token state
            onDecode={() => decodeToken(token, jwks, oidcConfig)} // Explicitly trigger decode on button click
            onReset={handleReset}
            onJwksResolved={handleJwksFromExample} // For auto-loading JWKS from example btn
            initialToken={initialToken} // Pass initial token if present
            onSelectTokenFromHistory={handleSelectToken} // Pass the callback for history selection
          />
        </CardContent>
      </Card>

      {/* Decoded Token Details Card (Conditionally Rendered) */}
      {decodedToken && (
        <Card className="lg:col-span-1">
          <CardContent className="p-5">
            {/* Header Section with Badges and Size */}
            <div className="flex flex-col space-y-3 mb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {/* Signature and Demo Status Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <SignatureStatusBadge
                    decodedToken={decodedToken}
                    tokenType={tokenType}
                    isDemoToken={isDemoToken}
                    jwks={jwks}
                  />
                  <DemoTokenBadge isDemoToken={isDemoToken} />
                </div>
                {/* Token Type Badge */}
                <div className="flex items-center">
                  <span className="mr-2 text-sm">Detected:</span>
                  <TokenTypeBadge
                    decodedToken={decodedToken}
                    tokenType={tokenType}
                    isDemoToken={isDemoToken}
                    jwks={jwks}
                  />
                </div>
              </div>

              {/* Warning for Unknown Type */}
              {tokenType === 'unknown' && (
                <Alert className="mt-2 bg-amber-500/10 border-amber-500/20 text-amber-700">
                  <AlertDescription>
                    Could not definitively determine token type based on standard claims.
                  </AlertDescription>
                </Alert>
              )}

              {/* Token Size Component */}
              <div className="border-t pt-3">
                <TokenSize token={decodedToken.raw} />
              </div>
            </div>

            {/* Tabs for Decoded Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 w-full flex overflow-x-auto max-w-full">
                <TabsTrigger value="header" className="flex-1 min-w-fit">
                  Header
                </TabsTrigger>
                <TabsTrigger value="payload" className="flex-1 min-w-fit">
                  Payload
                </TabsTrigger>
                <TabsTrigger value="signature" className="flex-1 min-w-fit">
                  Signature
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex-1 min-w-fit">
                  Timeline
                </TabsTrigger>
              </TabsList>

              <TabsContent value="header">
                <TokenHeader
                  header={decodedToken.header}
                  validationResults={validationResults.filter((r) => r.claim.startsWith('header.'))}
                />
              </TabsContent>

              <TabsContent value="payload">
                <TokenPayload
                  payload={decodedToken.payload}
                  tokenType={tokenType}
                  validationResults={validationResults.filter(
                    (r) => !r.claim.startsWith('header.')
                  )}
                />
              </TabsContent>

              <TabsContent value="signature">
                <TokenSignature
                  token={decodedToken.raw}
                  header={decodedToken.header}
                  signatureError={decodedToken.signature.error}
                  signatureValid={decodedToken.signature.valid}
                  jwks={jwks} // Pass current JWKS state
                  issuerUrl={issuerUrl} // Pass current issuer state
                  setIssuerUrl={setManualIssuerUrl} // Allow resolver to update issuer
                  onJwksResolved={handleJwksResolved} // Function to call when JWKS are resolved/loaded
                  isCurrentTokenDemo={isDemoToken} // Pass the flag indicating if CURRENT token is demo
                  oidcConfig={oidcConfig} // Pass OIDC config data
                  isLoadingOidcConfig={isOidcConfigLoading} // Pass loading state
                />
              </TabsContent>

              <TabsContent value="timeline">
                <TokenTimeline payload={decodedToken.payload} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Placeholder when no token is decoded AND no format error exists */}
      {!decodedToken && !validationResults.some((r) => r.claim === 'format' && !r.valid) && (
        <Empty className="lg:col-span-1 py-12">
          <EmptyMedia variant="icon" className="bg-primary/10 text-primary">
            <Key size={20} />
          </EmptyMedia>
          <EmptyTitle>No token inspected</EmptyTitle>
          <EmptyDescription>
            Paste or generate a token above, then choose{' '}
            <span className="font-medium">Inspect Token</span> to view claims and signature details.
          </EmptyDescription>
        </Empty>
      )}

      {/* Error display specifically for format errors */}
      {validationResults.some((r) => r.claim === 'format' && !r.valid) && (
        <Card className="lg:col-span-1 border-destructive bg-destructive/5">
          <CardContent className="p-5">
            <Alert variant="destructive" className="border-0 bg-transparent p-0 text-destructive">
              <AlertDescription>
                {validationResults.find((r) => r.claim === 'format')?.message ||
                  'Invalid token format.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
