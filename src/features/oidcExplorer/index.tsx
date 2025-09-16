import { useState, useEffect, useRef } from 'react'
import { useOidcConfig } from '@/hooks/data-fetching/useOidcConfig'
import { useJwks } from '@/hooks/data-fetching/useJwks'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { ConfigInput, ConfigDisplay, JwksDisplay, ProviderInfo } from './components'
import { detectProvider } from './utils/config-helpers'
import { useIssuerHistory } from '../../lib/state'

export function OidcExplorer() {
  // Instantiate hooks
  const oidcConfigHook = useOidcConfig()
  const {
    data: jwksData,
    error: jwksError,
    fetchJwks,
    isLoading: isJwksLoading,
  } = useJwks()
  const { addIssuer } = useIssuerHistory()

  // Local state for derived/UI data
  const [providerName, setProviderName] = useState<string | null>(null)
  const [detectionReasons, setDetectionReasons] = useState<string[]>([])
  const [currentIssuerUrl, setCurrentIssuerUrl] = useState<string>('')
  const [inputIssuerUrl, setInputIssuerUrl] = useState<string>('')
  const [lastFetchedJwksUri, setLastFetchedJwksUri] = useState<string | null>(null)

  // Use a ref to track if we've already added this URL to history
  const processedUrls = useRef<Set<string>>(new Set())

  // Effect for successful OIDC config fetch
  useEffect(() => {
    if (oidcConfigHook.data) {
      const config = oidcConfigHook.data
      console.log('OIDC Config loaded via hook:', config)
      setCurrentIssuerUrl(config.issuer) // Store the issuer from the fetched config

      // Only add to history if we haven't processed this URL yet
      if (
        inputIssuerUrl &&
        inputIssuerUrl.trim().length > 0 &&
        !processedUrls.current.has(inputIssuerUrl)
      ) {
        // Mark as processed to prevent re-adding
        processedUrls.current.add(inputIssuerUrl)
        addIssuer(inputIssuerUrl)
      }

      // Detect provider and reasons
      const { name: detectedProvider, reasons } = detectProvider(config.issuer, config)
      setProviderName(detectedProvider)
      setDetectionReasons(reasons)

      // Automatically trigger JWKS fetch if URI exists and hasn't been fetched already
      if (config.jwks_uri && config.jwks_uri !== lastFetchedJwksUri) {
        console.log(`OIDC config has jwks_uri, fetching JWKS from: ${config.jwks_uri}`)
        setLastFetchedJwksUri(config.jwks_uri)
        fetchJwks(config.jwks_uri)
      } else if (!config.jwks_uri) {
        console.log('OIDC config does not have jwks_uri.')
      } else {
        console.log(`JWKS already fetched for URI: ${config.jwks_uri}`)
      }
    }
  }, [addIssuer, fetchJwks, inputIssuerUrl, lastFetchedJwksUri, oidcConfigHook.data])

  // Effect for successful JWKS fetch
  useEffect(() => {
    if (jwksData) {
      console.log('JWKS loaded via hook:', jwksData)
      toast.success('Successfully fetched JWKS', {
        description: `Found ${jwksData.keys.length} keys`,
        duration: 5000,
      })
    }
  }, [jwksData])

  // Effect for handling errors from either hook
  useEffect(() => {
    const error = oidcConfigHook.error || jwksError
    if (error) {
      console.error('Error fetching OIDC config or JWKS:', error)
      toast.error('Failed to fetch data', {
        description: error.message,
        duration: 8000,
      })
      // Reset provider name on error
      setProviderName(null)
    }
  }, [jwksError, oidcConfigHook.error])

  // Handle fetch request from ConfigInput or IssuerHistory
  const handleFetchConfig = (issuerUrl: string) => {
    setInputIssuerUrl(issuerUrl) // Store the URL that was input
    oidcConfigHook.fetchConfig(issuerUrl)
  }

  // Combine loading states
  const isLoading = oidcConfigHook.isLoading || isJwksLoading
  // Combine error states
  const error = oidcConfigHook.error || jwksError

  return (
    <div className="space-y-6">
      {/* Configuration Input */}
      <Card>
        <CardContent className="p-5">
          {/* Config Input Component */}
          <ConfigInput onFetchRequested={handleFetchConfig} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-8 rounded-lg border border-border bg-card">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {oidcConfigHook.isLoading
                ? 'Fetching configuration...'
                : isJwksLoading
                  ? 'Fetching JWKS...'
                  : 'Idle'}
            </p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Display the configuration and JWKS using Tabs */}
      {!isLoading && oidcConfigHook.data && (
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            {oidcConfigHook.data.jwks_uri && (
              <TabsTrigger value="jwks" disabled={!jwksData}>
                JWKS
              </TabsTrigger>
            )}
          </TabsList>

          {/* Configuration Tab Content */}
          <TabsContent value="config" className="mt-4 space-y-6">
            <ConfigDisplay config={oidcConfigHook.data} />
            {providerName && (
              <ProviderInfo
                providerName={providerName}
                issuerUrl={currentIssuerUrl}
                reasons={detectionReasons}
              />
            )}
          </TabsContent>

          {/* JWKS Tab Content */}
          {oidcConfigHook.data.jwks_uri && (
            <TabsContent value="jwks" className="mt-4">
              {jwksData ? (
                <JwksDisplay jwks={jwksData as any} jwksUri={oidcConfigHook.data.jwks_uri!} />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {isJwksLoading ? 'Loading JWKS...' : 'JWKS data not yet available.'}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  )
}
