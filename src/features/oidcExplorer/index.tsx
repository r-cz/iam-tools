import { useState } from "react";
import { 
  Card, 
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { InfoIcon, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
    
    // Try to detect the provider
    const detectedProvider = detectProvider(config.issuer);
    setProviderName(detectedProvider);
  };

  const handleError = (error: Error) => {
    setError(error);
    setOidcConfig(null);
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
    } catch (err) {
      setError(err as Error);
      setJwks(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Input */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <InfoIcon className="h-5 w-5 text-blue-600 mt-1 sm:mt-0" />
            <p className="text-sm text-muted-foreground">
              This tool helps you explore and understand OpenID Connect providers. 
              Enter an issuer URL below to fetch its configuration and JWKS.
            </p>
          </div>
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

      {/* Display the configuration and provider info side by side */}
      {!isLoading && oidcConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <ConfigDisplay 
              config={oidcConfig} 
              onJwksClick={handleFetchJwks} 
            />
          </div>
          <div className="lg:col-span-1">
            <ProviderInfo 
              providerName={providerName} 
              issuerUrl={issuerUrl} 
            />
          </div>
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

      {/* Success notification after fetching config */}
      {oidcConfig && !error && (
        <div className="fixed bottom-6 right-6 max-w-sm">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Successfully loaded configuration</AlertTitle>
            <AlertDescription className="text-green-700">
              Configuration loaded from {oidcConfig.issuer}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
