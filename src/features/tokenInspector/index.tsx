import { useState, useEffect } from 'react'
import * as jose from 'jose'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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
import { validateToken, determineTokenType } from './utils/token-validation'
import type { TokenType, DecodedToken, ValidationResult } from '@/types' // Point to the shared types directory
import { getIssuerBaseUrl } from '@/lib/jwt/generate-signed-token'
import { useTokenHistory } from '../../lib/state'
import { verifySignatureWithRefresh } from '@/lib/jwt/verify-signature-with-refresh'
import { useOidcConfig } from '@/hooks/data-fetching/useOidcConfig'
import { decodeJWT } from '@/lib/jwt/decode-token'

interface TokenInspectorProps {
  initialToken?: string | null
}

export function TokenInspector({ initialToken = null }: TokenInspectorProps) {
  const [token, setToken] = useState(initialToken || '')
  const [jwks, setJwks] = useState<jose.JSONWebKeySet | null>(null) // Holds the currently loaded JWKS
  const [decodedToken, setDecodedToken] = useState<DecodedToken | null>(null)
  const [tokenType, setTokenType] = useState<TokenType>('unknown') // Default to unknown
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [activeTab, setActiveTab] = useState('payload')
  const [issuerUrl, setIssuerUrl] = useState('')
  const [isDemoToken, setIsDemoToken] = useState(false) // Tracks if the CURRENT decoded token is a demo one

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
    decodeToken(token, jwks) // Attempt decode with current token and JWKS state
     
  }, [token]) // Rerun when the main token string changes

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

  const resetState = () => {
    if (import.meta?.env?.DEV) {
      console.log('Resetting Token Inspector state.')
    }
    setToken('') // Clear token input state
    setDecodedToken(null)
    setValidationResults([])
    setActiveTab('payload')
    setIsDemoToken(false)
    setJwks(null) // Reset loaded JWKS
    setIssuerUrl('')
    // Clear token from URL if it was present
    if (initialToken) {
      const url = new URL(window.location.href)
      url.searchParams.delete('token')
      window.history.replaceState({}, '', url.toString())
    }
  }

  // Callback for TokenInput when an example token is generated
  // It provides the corresponding DEMO_JWKS immediately
  const handleJwksFromExample = (demoJwks: jose.JSONWebKeySet) => {
    if (import.meta?.env?.DEV) {
      console.log('Received demo JWKS automatically from TokenInput (example generated)')
    }
    setJwks(demoJwks) // Set the JWKS state
    // Re-decode is triggered by the 'token' state change anyway
  }

  // Main decoding and validation logic
  const decodeToken = async (tokenToDecode = token, currentJwks = jwks) => {
    if (!tokenToDecode) {
      setDecodedToken(null)
      setIsDemoToken(false)
      setValidationResults([])
      setTokenType('unknown')
      setIssuerUrl('')
      // Don't reset JWKS here, user might want to keep it loaded
      return
    }

    try {
      const decoded = decodeJWT(tokenToDecode)
      if (!decoded) throw new Error('Invalid JWT format')

      const { header, payload } = decoded

      // Add token to history when it's successfully decoded
      if (token && token.trim().length > 0) {
        addToken(token)
      }

      // Determine if it's a demo token
      const demoIssuerUrl = getIssuerBaseUrl()
      // Check explicit claim first, then check issuer matching our known demo issuer URL
      const isLikelyDemo =
        payload.is_demo_token === true ||
        (payload.iss && typeof payload.iss === 'string' && payload.iss === demoIssuerUrl)
      setIsDemoToken(Boolean(isLikelyDemo)) // Update state based on CURRENT token
      if (import.meta?.env?.DEV) {
        console.log('Decoded token. Is Demo:', isLikelyDemo, 'Issuer:', payload.iss)
      }

      // Determine token type and perform basic claim validation
      const detectedTokenType = determineTokenType(header, payload)
      setTokenType(detectedTokenType)
      const validationResults = validateToken(header, payload, detectedTokenType)

      // Set issuer URL for JWKS resolver (use demo issuer if it's a demo token)
      const issuerFromPayload = typeof payload.iss === 'string' ? payload.iss : ''
      const currentIssuer = isLikelyDemo ? demoIssuerUrl : issuerFromPayload
      if (currentIssuer && currentIssuer !== issuerUrl) {
        setIssuerUrl(currentIssuer)
      } else if (!currentIssuer) {
        setIssuerUrl('') // Clear if no issuer found
      }

      // Perform signature validation if JWKS are available
      let signatureValid = false
      let signatureError: string | undefined = undefined

      if (currentJwks) {
        try {
          // For demo tokens, accept matching kid as valid (due to potential env issues with crypto.sign)
          if (isLikelyDemo) {
            const matchingKey = currentJwks.keys.find((key) => key.kid === header.kid)
            if (matchingKey) {
              if (import.meta?.env?.DEV) {
                console.log(
                  `Demo token signature check: Found key ${header.kid}. Marking as valid.`
                )
              }
              signatureValid = true
            } else {
              throw new Error(`No key with ID "${header.kid}" found in the loaded JWKS`)
            }
          } else {
            // For non-demo tokens, perform actual crypto verification with automatic refresh
            if (import.meta?.env?.DEV) {
              console.log('Attempting cryptographic verification for non-demo token...')
            }

            // Get the JWKS URI from the OIDC config (if available)
            let jwksUri = ''

            // Check if we have OIDC config for this issuer
            if (oidcConfig && oidcConfig.issuer === payload.iss) {
              jwksUri = oidcConfig.jwks_uri || ''
              if (import.meta?.env?.DEV) {
                console.log('Using JWKS URI from OIDC config:', jwksUri)
              }
            } else if (payload.iss) {
              // Fallback: construct the JWKS URI (not all providers use standard .well-known/jwks)
              // Note: This is a guess and might not work for all providers
              jwksUri = `${payload.iss}/.well-known/jwks`
              if (import.meta?.env?.DEV) {
                console.log('Using guessed JWKS URI:', jwksUri)
              }
            }

            const result = await verifySignatureWithRefresh(
              tokenToDecode,
              jwksUri,
              currentJwks,
              (refreshedJwks) => {
                if (import.meta?.env?.DEV) {
                  console.log('JWKS refreshed during verification')
                }
                setJwks(refreshedJwks)
              }
            )

            signatureValid = result.valid
            signatureError = result.error
          }
        } catch (e: any) {
          if (import.meta?.env?.DEV) {
            console.error('Signature verification error:', e)
          }
          signatureError = e.message
          signatureValid = false
        }
      } else {
        signatureError = 'JWKS not yet loaded for validation.'
      }

      // Update state with decoded results
      setDecodedToken({
        header,
        payload,
        signature: { valid: signatureValid, error: signatureError },
        raw: tokenToDecode,
      })
      setValidationResults(validationResults)
    } catch (err: any) {
      if (import.meta?.env?.DEV) {
        console.error('Token decoding/validation failed:', err)
      }
      setDecodedToken(null) // Clear decoded state on error
      setIsDemoToken(false)
      setTokenType('unknown')
      setValidationResults([
        {
          claim: 'format',
          valid: false,
          message: `Invalid token: ${err.message}`,
          severity: 'error',
        },
      ])
      // Don't reset JWKS or issuerUrl on format error
    }
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
      await decodeToken(decodedToken.raw, resolvedJwks) // Pass current token and new JWKS
    }
  }

  // Helper function for rendering signature status badge
  const getSignatureStatusBadge = () => {
    if (!decodedToken) return null // No token, no status

    // If JWKS are loaded, show valid/invalid status
    if (jwks) {
      if (decodedToken.signature.valid) {
        return (
          <Badge variant="outline" className="bg-green-500/20 text-green-700 hover:bg-green-500/20">
            Signature Valid
          </Badge>
        )
      } else {
        return (
          <Badge variant="outline" className="bg-red-500/20 text-red-700 hover:bg-red-500/20">
            Signature Invalid
          </Badge>
        )
      }
    }

    // If JWKS are not loaded, show "Not Verified"
    return (
      <Badge variant="outline" className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/20">
        Signature Not Verified
      </Badge>
    )
  }

  // Helper function for rendering token type badge
  const getTokenTypeBadge = () => {
    if (!decodedToken) return null // No token, no type

    switch (tokenType) {
      case 'id_token':
        return (
          <Badge variant="outline" className="bg-blue-500/20 text-blue-700 hover:bg-blue-500/20">
            OIDC ID Token
          </Badge>
        )
      case 'access_token': {
        const typ = decodedToken.header?.typ
        if (typ === 'at+jwt' || typ === 'application/at+jwt') {
          return (
            <Badge
              variant="outline"
              className="bg-purple-500/20 text-purple-700 hover:bg-purple-500/20"
            >
              OAuth JWT Access Token (RFC9068)
            </Badge>
          )
        }

        return (
          <Badge variant="outline" className="bg-green-500/20 text-green-700 hover:bg-green-500/20">
            OAuth Access Token
          </Badge>
        )
      }
      default:
        return (
          <Badge variant="outline" className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/20">
            Unknown Token Type
          </Badge>
        )
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
            onDecode={() => decodeToken(token)} // Explicitly trigger decode on button click
            onReset={resetState}
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
                  {getSignatureStatusBadge()}
                  {isDemoToken && (
                    <Badge
                      variant="outline"
                      className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/10"
                    >
                      Demo Token
                    </Badge>
                  )}
                </div>
                {/* Token Type Badge */}
                <div className="flex items-center">
                  <span className="mr-2 text-sm">Detected:</span>
                  {getTokenTypeBadge()}
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
                  setIssuerUrl={setIssuerUrl} // Allow resolver to update issuer
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
            Paste or generate a token above, then choose <span className="font-medium">Inspect Token</span> to view claims and signature details.
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
