import { useState, useEffect } from "react"; // Added useEffect
import { useOidcConfig } from "@/hooks/data-fetching/useOidcConfig"; // Import hook
import { useJwks } from "@/hooks/data-fetching/useJwks"; // Import hook
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ConfigInput } from "./components/ConfigInput";
import { ConfigDisplay } from "./components/ConfigDisplay";
import { JwksDisplay } from "./components/JwksDisplay";
import { ProviderInfo } from "./components/ProviderInfo";
// Removed Jwks type import as it's inferred from the hook
// Removed fetchJwks import, keep detectProvider
import { detectProvider } from "./utils/config-helpers";

export function OidcExplorer() {
  // Instantiate hooks
  const oidcConfigHook = useOidcConfig();
  const jwksHook = useJwks();

  // Local state for derived/UI data
  const [providerName, setProviderName] = useState<string | null>(null);
  const [detectionReasons, setDetectionReasons] = useState<string[]>([]); // State for reasons
  const [currentIssuerUrl, setCurrentIssuerUrl] = useState<string>(''); // Store the URL used for the current fetch

  // Effect for successful OIDC config fetch
  useEffect(() => {
    if (oidcConfigHook.data) {
      const config = oidcConfigHook.data;
      console.log('OIDC Config loaded via hook:', config);
      setCurrentIssuerUrl(config.issuer); // Store the issuer from the fetched config

      // Detect provider and reasons
      const { name: detectedProvider, reasons } = detectProvider(config.issuer, config);
      setProviderName(detectedProvider);
      setDetectionReasons(reasons); // Store reasons

      // Automatically trigger JWKS fetch if URI exists
      if (config.jwks_uri) {
        console.log(`OIDC config has jwks_uri, fetching JWKS from: ${config.jwks_uri}`);
        jwksHook.fetchJwks(config.jwks_uri);
      } else {
        console.log('OIDC config does not have jwks_uri.');
        // Clear previous JWKS data if any
        // Note: The useJwks hook doesn't automatically clear data,
        // but fetching with an empty string does. Or we could add a reset function to the hook.
        // For now, relying on the fact that jwksHook.data will be null if fetchJwks wasn't called or failed.
      }

      // Optional: Toast for config success (can be noisy)
      // toast.success('Successfully fetched OIDC configuration');

    }
  }, [oidcConfigHook.data]); // Dependency: OIDC hook data

  // Effect for successful JWKS fetch
  useEffect(() => {
    if (jwksHook.data) {
      console.log('JWKS loaded via hook:', jwksHook.data);
      toast.success('Successfully fetched JWKS', {
        description: `Found ${jwksHook.data.keys.length} keys`,
        duration: 5000,
      });
    }
  }, [jwksHook.data]); // Dependency: JWKS hook data

  // Effect for handling errors from either hook
  useEffect(() => {
    const error = oidcConfigHook.error || jwksHook.error;
    if (error) {
      console.error('Error fetching OIDC config or JWKS:', error);
      toast.error('Failed to fetch data', {
        description: error.message,
        duration: 8000,
      });
      // Reset provider name on error
      setProviderName(null);
    }
  }, [oidcConfigHook.error, jwksHook.error]); // Dependencies: hook errors

  // Combine loading states
  const isLoading = oidcConfigHook.isLoading || jwksHook.isLoading;
  // Combine error states
  const error = oidcConfigHook.error || jwksHook.error;

  return (
    <div className="space-y-6">
      {/* Configuration Input */}
      <Card>
        <CardContent className="p-5">
          <ConfigInput
            // Pass the hook's fetch function as the callback
            onFetchRequested={oidcConfigHook.fetchConfig}
            // Pass the combined loading state
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-8 rounded-lg border border-border bg-card">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            {/* Be more specific about what's loading */}
            <p className="text-sm text-muted-foreground">
              {oidcConfigHook.isLoading ? 'Fetching configuration...' : 'Fetching JWKS...'}
            </p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && !isLoading && ( // Only show error if not loading
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Display the configuration and JWKS using Tabs */}
      {/* Use hook data directly for conditional rendering */}
      {!isLoading && oidcConfigHook.data && (
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            {/* Only show JWKS tab trigger if JWKS URI exists in config */}
            {oidcConfigHook.data.jwks_uri && (
              // Disable tab until JWKS data is loaded
              <TabsTrigger value="jwks" disabled={!jwksHook.data}>
                JWKS
              </TabsTrigger>
            )}
          </TabsList>

          {/* Configuration Tab Content */}
          <TabsContent value="config" className="mt-4 space-y-6">
            {/* Pass data directly from hook */}
            <ConfigDisplay config={oidcConfigHook.data} />
            {providerName && (
              <ProviderInfo
                providerName={providerName}
                // Use the stored issuer URL corresponding to the fetched config
                issuerUrl={currentIssuerUrl}
                reasons={detectionReasons} // Pass reasons
              />
            )}
          </TabsContent>

          {/* JWKS Tab Content */}
          {oidcConfigHook.data.jwks_uri && (
            <TabsContent value="jwks" className="mt-4">
              {/* Use JWKS hook data directly */}
              {jwksHook.data ? (
                <JwksDisplay
                  // Cast might be needed if hook type isn't exactly Jwks from './utils/types'
                  jwks={jwksHook.data as any}
                  jwksUri={oidcConfigHook.data.jwks_uri!} // Non-null assertion ok
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {/* Show specific message if JWKS is loading vs not available */}
                  {jwksHook.isLoading ? 'Loading JWKS...' : 'JWKS data not yet available.'}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
