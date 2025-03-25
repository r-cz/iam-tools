import { useState } from "react";
import { 
  Card, 
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2 } from "lucide-react";
// Importing components for the OIDC Explorer
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
    
    // Show success toast
    toast.success('Successfully loaded configuration', {
      description: `Configuration loaded from ${config.issuer}`,
      duration: 5000, // 5 seconds
    });
  };

  const handleError = (error: Error) => {
    setError(error);
    setOidcConfig(null);
    
    // Show error toast
    toast.error('Error fetching configuration', {
      description: error.message,
      duration: 8000, // 8 seconds for error messages
    });
  };

  const handleFetchJwks = async () => {
    if (!oidcConfig || !oidcConfig.jwks_uri) {
      setError(new Error("No JWKS URI available in the configuration"));
      return;
    }

    setIsLoading(true);
    try {
      const jwksData = await fetchJwks(oidcConfig.jwks_uri);
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

      {/* Display the configuration */}
      {!isLoading && oidcConfig && (
        <div className="space-y-6">
          <ConfigDisplay 
            config={oidcConfig} 
            onJwksClick={handleFetchJwks} 
          />
          
          {/* Provider info now at the bottom */}
          {providerName && (
            <ProviderInfo 
              providerName={providerName} 
              issuerUrl={issuerUrl} 
            />
          )}
        </div>
      )}

      {/* JWKS Display */}
      {jwks && oidcConfig?.jwks_uri && (
        <div className="mt-6">
          <Separator className="mb-6" />
          <JwksDisplay 
            jwks={jwks} 
            jwksUri={oidcConfig.jwks_uri} 
          />
        </div>
      )}
    </div>
  );
}
