import { useState, useEffect, useRef } from 'react'
import { useOidcConfig } from '@/hooks/data-fetching/useOidcConfig'
import { useJwks } from '@/hooks/data-fetching/useJwks'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

import { ConfigInput, ConfigDisplay, JwksDisplay, ProviderInfo } from './components'
import { detectProvider } from './utils/config-helpers'
import { useIssuerHistory } from '../../lib/state'

export function OidcExplorer() {
  // Instantiate hooks
  const oidcConfigHook = useOidcConfig()
  const { data: jwksData, error: jwksError, fetchJwks, isLoading: isJwksLoading } = useJwks()
  const { addIssuer } = useIssuerHistory()

  // Local state for derived/UI data
  const [providerName, setProviderName] = useState<string | null>(null)
  const [detectionReasons, setDetectionReasons] = useState<string[]>([])
  const [currentIssuerUrl, setCurrentIssuerUrl] = useState<string>('')
  const [inputIssuerUrl, setInputIssuerUrl] = useState<string>('')

  // Use a ref to track if we've already added this URL to history
  const processedUrls = useRef<Set<string>>(new Set())
  const lastConfigSignatureRef = useRef<string | null>(null)

  // Effect for successful OIDC config fetch
  useEffect(() => {
    const config = oidcConfigHook.data
    if (!config) return

    const configSignature = `${config.issuer ?? ''}|${config.jwks_uri ?? ''}`
    if (lastConfigSignatureRef.current === configSignature) {
      return
    }

    lastConfigSignatureRef.current = configSignature
    setCurrentIssuerUrl(config.issuer)

    if (
      inputIssuerUrl &&
      inputIssuerUrl.trim().length > 0 &&
      !processedUrls.current.has(inputIssuerUrl)
    ) {
      processedUrls.current.add(inputIssuerUrl)
      addIssuer(inputIssuerUrl)
    }

    const { name: detectedProvider, reasons } = detectProvider(config.issuer, config)
    setProviderName(detectedProvider)
    setDetectionReasons(reasons)

    if (config.jwks_uri) {
      fetchJwks(config.jwks_uri)
    }
  }, [addIssuer, fetchJwks, inputIssuerUrl, oidcConfigHook.data])

  // Effect for successful JWKS fetch
  useEffect(() => {
    if (jwksData) {
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
      if (import.meta?.env?.DEV) {
        console.error('Error fetching OIDC config or JWKS:', error)
      }
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
      {/* Config Input Component */}
      <ConfigInput onFetchRequested={handleFetchConfig} isLoading={isLoading} />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center rounded-lg border border-border bg-card p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <Spinner size="lg" thickness="thin" label="Loading data" className="text-primary" />
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
                <Empty className="py-12">
                  <EmptyMedia variant="icon" className="bg-primary/5 text-primary">
                    {isJwksLoading ? (
                      <Spinner size="sm" thickness="thin" aria-hidden="true" />
                    ) : (
                      <KeyRound className="h-5 w-5" />
                    )}
                  </EmptyMedia>
                  <EmptyTitle>
                    {isJwksLoading ? 'Fetching JWKS' : 'JWKS not yet available'}
                  </EmptyTitle>
                  <EmptyDescription>
                    {isJwksLoading
                      ? 'Hold tight while we retrieve the JSON Web Keys for this issuer.'
                      : 'Fetch configuration or wait for the JWKS endpoint to respond to inspect keys here.'}
                  </EmptyDescription>
                </Empty>
              )}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  )
}
