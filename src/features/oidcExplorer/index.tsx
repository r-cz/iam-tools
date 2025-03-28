import { useState } from "react";
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ConfigInput } from "./components/ConfigInput";
import { ConfigDisplay } from "./components/ConfigDisplay";
import { JwksDisplay } from "./components/JwksDisplay";
import { ProviderInfo } from "./components/ProviderInfo";
import { OidcConfiguration, Jwks } from "./utils/types";
import { fetchJwks, detectProvider } from "./utils/config-helpers";

export function OidcExplorer() {
  const [oidcConfig, setOidcConfig] = useState<OidcConfiguration | null>(null);
  const [jwks, setJwks] = useState<Jwks | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [issuerUrl, setIssuerUrl] = useState<string>('');

  const handleConfigFetched = (config: OidcConfiguration) => {
    setOidcConfig(config);
    setError(null);
    setJwks(null); // Reset JWKS when new config is fetched
    setIssuerUrl(config.issuer);
    
    // Try to detect the provider using both URL and configuration data
    const detectedProvider = detectProvider(config.issuer, config);
    setProviderName(detectedProvider);
    
    // --- REMOVED Config success toast ---

    // --- Automatically fetch JWKS if URI exists ---
    if (config.jwks_uri) {
      // Use a brief timeout to allow the UI to update with the config first
      // and avoid potential state update conflicts if fetchJwks is too fast.
      setTimeout(() => {
        // Pass the URI directly from the fetched config
        handleFetchJwks(config.jwks_uri); 
      }, 100); 
    }
    // --- End auto-fetch ---
  };

  // This is the correct handleError function
  const handleError = (error: Error) => { 
    setError(error);
    setOidcConfig(null);
    
    // Show error toast
    toast.error('Error fetching configuration', {
      description: error.message,
      duration: 8000, // 8 seconds for error messages
    });
  };

  // Modified to accept optional jwksUri argument
  const handleFetchJwks = async (jwksUri?: string) => { 
    const uriToFetch = jwksUri || oidcConfig?.jwks_uri; // Use arg first, fallback to state

    if (!uriToFetch) { // Check the resolved URI
      setError(new Error("No JWKS URI available in the configuration"));
      return;
    }

    setIsLoading(true);
    try {
      const jwksData = await fetchJwks(uriToFetch); // Use uriToFetch
      setJwks(jwksData);
      setError(null);
      
      // Show success toast
      toast.success('Successfully fetched JWKS', {
        description: `Found ${jwksData.keys.length} keys in the JWKS`,
        duration: 5000, // 5 seconds
      });
    } catch (err) {
      setError(err as Error);
      setJwks(null);
      
      // Show error toast
      toast.error('Failed to fetch JWKS', {
        description: (err as Error).message,
        duration: 8000, // 8 seconds for error messages
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Input */}
      <Card>
        <CardContent className="p-5">
          <ConfigInput 
            onConfigFetched={handleConfigFetched} 
            onError={handleError} 
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </CardContent>
      </Card>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-8 rounded-lg border border-border bg-card">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Fetching configuration data...</p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Display the configuration and JWKS using Tabs */}
      {!isLoading && oidcConfig && (
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            {/* Only show JWKS tab trigger if JWKS URI exists in config */}
            {oidcConfig.jwks_uri && (
              // Remove onClick handler, disable until JWKS is loaded
              <TabsTrigger value="jwks" disabled={!jwks}> 
                JWKS {isLoading && jwks === null && <Loader2 className="ml-2 h-4 w-4 animate-spin" />} 
              </TabsTrigger>
            )}
          </TabsList>
          
          {/* Configuration Tab Content */}
          <TabsContent value="config" className="mt-4 space-y-6">
            <ConfigDisplay 
              config={oidcConfig} 
              // Call handleFetchJwks without args here, so it uses state (for manual click)
              onJwksClick={() => handleFetchJwks()} 
            />
            {providerName && (
              <ProviderInfo
                providerName={providerName} 
                issuerUrl={issuerUrl} 
              />
            )}
          </TabsContent>

          {/* JWKS Tab Content */}
          {oidcConfig.jwks_uri && (
            <TabsContent value="jwks" className="mt-4">
              {jwks ? (
                <JwksDisplay 
                  jwks={jwks} 
                  // Ensure we use the correct URI here as well
                  jwksUri={oidcConfig.jwks_uri!} // Non-null assertion ok since tab is conditional
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {/* Update text to reflect automatic fetching */}
                  {isLoading ? 'Loading JWKS...' : 'JWKS data will be fetched automatically if available.'} 
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
